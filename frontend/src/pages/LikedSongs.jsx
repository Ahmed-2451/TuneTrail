import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../contexts/PlayerContext'
import { useAuth } from '../contexts/AuthContext'
import { getThemedTrackImage } from '../utils/trackImageUtils'

const LikedSongs = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, profilePhoto, getUserInitials, getDisplayName } = useAuth()
  const { 
    getLikedSongsCount, 
    likedSongs, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    toggleLike 
  } = usePlayer()
  
  const [likedTracks, setLikedTracks] = useState([])
  const [sortBy, setSortBy] = useState('recently-added')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load liked tracks from backend
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLikedTracks()
    } else {
      setLikedTracks([])
      setLoading(false)
    }
  }, [likedSongs, isAuthenticated, user])

  const loadLikedTracks = async () => {
    try {
      setLoading(true)
      console.log(`🎵 Loading liked songs for user ${user.id}...`)
      
      const response = await fetch(`/api/users/${user.id}/liked-songs`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Failed to load liked tracks: ${response.status}`)
      }
      
      const tracks = await response.json()
      console.log('✅ Loaded tracks:', tracks)
      console.log('Number of tracks:', tracks.length)
      
      setLikedTracks(tracks)
      setError('')
    } catch (err) {
      console.error('Error loading liked tracks:', err)
      setError(`Failed to load liked songs. Please try again. Error: ${err.message}`)
      setLikedTracks([])
    } finally {
      setLoading(false)
    }
  }

  const handlePlayTrack = (track, index) => {
    playTrack(track, likedTracks, index)
  }

  const handleToggleLike = async (track) => {
    try {
      // For external tracks, we need to pass track data as well
      await toggleLike(track, track)
      // Reload tracks after like/unlike
      await loadLikedTracks()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks, 0)
    }
  }

  const handleShuffle = () => {
    if (likedTracks.length > 0) {
      const shuffledTracks = [...likedTracks].sort(() => Math.random() - 0.5)
      playTrack(shuffledTracks[0], shuffledTracks, 0)
    }
  }

  const handleDownload = async () => {
    if (likedTracks.length === 0) return
    
    try {
      // Create a simple JSON file with liked songs data
      const data = {
        playlist: 'Liked Songs',
        user: user?.name || 'User',
        exported_at: new Date().toISOString(),
        tracks: likedTracks.map(track => ({
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          liked_at: track.liked_at,
          source: track.source
        }))
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tunetrail-liked-songs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading playlist:', err)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateAdded = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} month${Math.ceil(diffDays / 30) > 1 ? 's' : ''} ago`
    return `${Math.ceil(diffDays / 365)} year${Math.ceil(diffDays / 365) > 1 ? 's' : ''} ago`
  }

  const getTrackInfo = (track) => {
    // Get track information with fallbacks
    const trackTitle = track.title || 'Unknown Title'
    const trackArtist = track.artist || 'Unknown Artist'  
    const trackAlbum = track.album || track.title || 'Unknown Album'
    
    // Get the proper image URL
    let trackImage = null
    if (track.cover_url && !track.cover_url.includes('placeholder')) {
      trackImage = track.cover_url
    } else if (track.artwork_url && !track.artwork_url.includes('placeholder')) {
      trackImage = track.artwork_url
    }
    
    return { trackTitle, trackArtist, trackAlbum, trackImage }
  }

  const handleLike = async (track, index) => {
    try {
      await toggleLike(track, track)
      // Reload tracks after like/unlike
      await loadLikedTracks()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="liked-songs-page">
        <div className="liked-songs-header">
          <div className="liked-songs-gradient">
            <i className="fas fa-heart"></i>
          </div>
          <div className="playlist-info">
            <p className="playlist-type">Playlist</p>
            <h1 className="playlist-title">Liked Songs</h1>
            <div className="playlist-meta">
              <span>Please log in to view your liked songs</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="liked-songs-page">
      {/* Header Section */}
      <div className="liked-songs-header">
        <div className="liked-songs-artwork">
          <div className="liked-songs-gradient">
            <i className="fas fa-heart"></i>
          </div>
        </div>
        <div className="playlist-info">
          <p className="playlist-type">Playlist</p>
          <h1 className="playlist-title">Liked Songs</h1>
          <div className="playlist-meta">
            <span className="playlist-owner">
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt={getDisplayName()} 
                  className="owner-avatar" 
                />
              ) : (
                <div className="owner-avatar owner-avatar-fallback">
                  {getUserInitials()}
                </div>
              )}
              {getDisplayName()}
            </span>
            <span className="playlist-meta-item">{likedTracks.length} songs</span>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="playlist-controls">
        <button 
          className="play-all-btn" 
          onClick={handlePlayAll}
          disabled={likedTracks.length === 0}
        >
          <i className="fas fa-play"></i>
        </button>
        <button className="control-btn shuffle-btn" onClick={handleShuffle}>
          <i className="fas fa-random"></i>
        </button>
        <button className="control-btn download-btn" onClick={handleDownload}>
          <i className="fas fa-download"></i>
        </button>
      </div>

      {/* Track List */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your liked songs...</p>
        </div>
      ) : error ? (
        <div className="error-banner">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button className="retry-btn" onClick={loadLikedTracks}>
            <i className="fas fa-redo"></i>
            Retry
          </button>
        </div>
      ) : likedTracks.length === 0 ? (
        <div className="empty-state centered">
          <div className="empty-state-content">
            <h3 className="empty-state-title">Songs you like will appear here</h3>
            <p className="empty-state-description">
              Save songs by tapping the heart icon.
            </p>
            <button 
              className="find-songs-btn"
              onClick={() => navigate('/search')}
            >
              <i className="fas fa-search"></i>
              Find songs to like
            </button>
          </div>
        </div>
      ) : (
        <div className="track-list">
          <div className="track-list-header">
            <span className="track-number">#</span>
            <span className="track-title-header">Title</span>
            <span className="track-album-header">Album</span>
            <span className="track-date-header">Date added</span>
            <span className="track-duration-header">
              <i className="fas fa-clock"></i>
            </span>
          </div>
          
          {likedTracks.map((track, index) => {
            const isCurrentTrack = currentTrack?.id === track.id
            console.log('Track data structure:', {
              id: track.id,
              title: track.title,
              artist: track.artist,
              album: track.album,
              filename: track.filename,
              cover_url: track.cover_url,
              artwork_url: track.artwork_url,
              source: track.source,
              liked_at: track.liked_at,
              allFields: track
            })
            
            const { trackTitle, trackArtist, trackAlbum, trackImage } = getTrackInfo(track)
            
            return (
              <div 
                key={`${track.id}-${index}`} 
                className={`track-item ${isCurrentTrack && isPlaying ? 'playing' : ''}`}
                onClick={() => handlePlayTrack(track, index)}
              >
                <div className="track-number-cell">
                  {isCurrentTrack && isPlaying ? (
                    <div className="music-visualizer">
                      <div className="music-bar"></div>
                      <div className="music-bar"></div>
                      <div className="music-bar"></div>
                      <div className="music-bar"></div>
                      <div className="music-bar"></div>
                    </div>
                  ) : (
                    <span className="track-number">{index + 1}</span>
                  )}
                  <button className="play-btn-hover">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
                
                <div className="track-main-info">
                  <img 
                    src={trackImage ? trackImage : getThemedTrackImage(track)} 
                    alt={trackTitle}
                    className="track-image-small"
                    onError={(e) => {
                      e.target.src = getThemedTrackImage(track)
                    }}
                  />
                  <div className="track-details">
                    <div className="track-name">{trackTitle}</div>
                    <div className="track-artist-name">{trackArtist}</div>
                  </div>
                </div>
                
                <div className="track-album">
                  {trackAlbum}
                </div>
                
                <div className="track-date">
                  {formatDateAdded(track.liked_at)}
                </div>
                
                <div className="track-duration-cell">
                  <button 
                    className="heart-btn liked"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(track, index)
                    }}
                  >
                    <i className="fas fa-heart"></i>
                  </button>
                  <span className="track-duration">{formatDuration(track.duration)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LikedSongs 