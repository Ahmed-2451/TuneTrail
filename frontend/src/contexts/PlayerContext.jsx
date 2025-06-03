import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const PlayerContext = createContext()

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

export const PlayerProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('none') // 'none', 'one', 'all'
  const [likedSongs, setLikedSongs] = useState(new Set())

  // Load liked songs from the backend
  const loadLikedSongs = async () => {
    // Only load if user is authenticated
    if (!isAuthenticated || !user) {
      setLikedSongs(new Set())
      return
    }

    try {
      console.log('🔄 Loading liked songs for user:', user.id)
      const response = await fetch(`/api/liked-songs?userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch liked songs: ${response.status}`)
      }
      
      const likedSongsData = await response.json()
      const likedTrackIds = likedSongsData.map(track => track.id)
      setLikedSongs(new Set(likedTrackIds))
      
      console.log(`✅ Loaded ${likedTrackIds.length} liked songs`)
    } catch (error) {
      console.error('❌ Error loading liked songs:', error)
      setLikedSongs(new Set())
    }
  }

  // Load liked songs when user authentication changes
  useEffect(() => {
    loadLikedSongs()
  }, [isAuthenticated, user])

  // Save liked songs to localStorage as backup
  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(Array.from(likedSongs)))
  }, [likedSongs])

  const playTrack = (track, trackQueue = null) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    
    if (trackQueue) {
      setQueue(trackQueue)
      const index = trackQueue.findIndex(t => t.id === track.id)
      setCurrentIndex(index >= 0 ? index : 0)
    }
  }

  const pauseTrack = () => {
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const nextTrack = () => {
    if (queue.length === 0) return

    let nextIndex
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = currentIndex + 1
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0
        } else {
          return
        }
      }
    }

    setCurrentIndex(nextIndex)
    setCurrentTrack(queue[nextIndex])
    setIsPlaying(true)
  }

  const previousTrack = () => {
    if (queue.length === 0) return

    let prevIndex
    if (shuffle) {
      prevIndex = Math.floor(Math.random() * queue.length)
    } else {
      prevIndex = currentIndex - 1
      if (prevIndex < 0) {
        if (repeat === 'all') {
          prevIndex = queue.length - 1
        } else {
          return
        }
      }
    }

    setCurrentIndex(prevIndex)
    setCurrentTrack(queue[prevIndex])
    setIsPlaying(true)
  }

  const toggleShuffle = () => {
    setShuffle(!shuffle)
  }

  const toggleRepeat = () => {
    const modes = ['none', 'all', 'one']
    const currentModeIndex = modes.indexOf(repeat)
    const nextModeIndex = (currentModeIndex + 1) % modes.length
    setRepeat(modes[nextModeIndex])
  }

  const toggleLike = async (trackIdOrTrack, trackData = null) => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      console.warn('User must be logged in to like songs')
      // You could show a toast or redirect to login here
      return
    }

    // Handle both cases: track ID string/number or track object
    let trackId, actualTrackData
    if (typeof trackIdOrTrack === 'object' && trackIdOrTrack !== null) {
      // If first parameter is a track object
      trackId = trackIdOrTrack.id
      actualTrackData = trackIdOrTrack
    } else {
      // If first parameter is just the track ID
      trackId = trackIdOrTrack
      actualTrackData = trackData
    }

    const originalLikedSongs = new Set(likedSongs)
    
    try {
      // Toggle in local state first for immediate UI feedback
      const newLikedSongs = new Set(likedSongs)
      const wasLiked = newLikedSongs.has(trackId)
      
      if (wasLiked) {
        newLikedSongs.delete(trackId)
      } else {
        newLikedSongs.add(trackId)
      }
      setLikedSongs(newLikedSongs)

      // Determine if this is an external track (Audius tracks have string IDs)
      const isExternalTrack = typeof trackId === 'string' && isNaN(parseInt(trackId))
      const endpoint = isExternalTrack 
        ? `/api/external-tracks/${trackId}/like`
        : `/api/tracks/${trackId}/like`
      
      // Use actual user ID from auth context
      const body = { userId: user.id }
      
      // Include track data for external tracks
      if (isExternalTrack && actualTrackData) {
        body.trackData = actualTrackData
      }

      // Sync with backend with timeout and retry logic
      const timeoutMs = 10000 // 10 seconds timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error || 'Server error'}`)
        }

        const result = await response.json()
        console.log(`✅ ${wasLiked ? 'Unliked' : 'Liked'} track successfully:`, result.message || 'Success')

        // Reload liked songs from backend to ensure consistency
        await loadLikedSongs()

      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out - please check your connection')
        } else if (fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network error - please check your connection')
        } else {
          throw fetchError
        }
      }

    } catch (error) {
      // Revert to original state on error
      setLikedSongs(originalLikedSongs)
      
      // Log specific error for debugging
      if (error.message.includes('timeout') || error.message.includes('connection')) {
        console.warn('Failed to sync like status with backend (connection issue):', error.message)
      } else {
        console.error('Failed to sync like status with backend:', error.message)
      }
      
      // Could show a toast notification here instead of just logging
      // For now, just ensure the UI reverts properly
      throw error // Re-throw so calling components can handle it
    }
  }

  const isLiked = (trackId) => {
    return likedSongs.has(trackId)
  }

  const getLikedSongsCount = () => {
    return likedSongs.size
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const value = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentIndex,
    shuffle,
    repeat,
    likedSongs,
    playTrack,
    pauseTrack,
    togglePlayPause,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    isLiked,
    getLikedSongsCount,
    formatTime,
    setCurrentTime,
    setDuration,
    setVolume
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
} 