import React, { useRef, useEffect, useState } from 'react'
import { usePlayer } from '../../contexts/PlayerContext'
import { getOptimizedImageProps } from '../../utils/imageUtils'

const Player = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    togglePlayPause,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    isLiked,
    formatTime,
    setVolume,
    setCurrentTime,
    setDuration
  } = usePlayer()

  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const playPromiseRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [justLiked, setJustLiked] = useState(false)

  // Check if user has interacted with the page (required for autoplay)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
    }
    const handleError = (e) => {
      setIsLoading(false)
      
      // Get more specific error information
      const target = e.target || e.currentTarget
      let errorMessage = 'Failed to load audio'
      
      if (target && target.error) {
        switch (target.error.code) {
          case target.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted'
            break
          case target.error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading audio'
            break
          case target.error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio file is corrupted or unsupported'
            break
          case target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported'
            break
          default:
            errorMessage = 'Unknown audio error occurred'
        }
      }
      
      setError(errorMessage)
      console.error('Audio error:', {
        error: e,
        code: target?.error?.code,
        message: target?.error?.message,
        src: target?.src
      })
    }
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => {
      // Cancel any pending promises before handling end
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
        playPromiseRef.current = null
      }
      
      if (repeat === 'one') {
        audio.currentTime = 0
        playPromiseRef.current = audio.play()
        if (playPromiseRef.current !== undefined) {
          playPromiseRef.current.catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Auto-repeat error:', err)
              setError('Failed to play audio')
            }
            playPromiseRef.current = null
          })
        }
      } else {
        nextTrack()
      }
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)

    return () => {
      // Cancel any pending promises on cleanup
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
        playPromiseRef.current = null
      }
      
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrack, repeat, nextTrack, setCurrentTime, setDuration])

  // Handle play/pause with improved promise management
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    // Cancel any pending play promise
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {
        // Ignore AbortError from cancelled promises
      })
      playPromiseRef.current = null
    }

    // Only handle play/pause if the track is already loaded
    if (isPlaying && audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      // Check if autoplay is allowed
      if (!hasUserInteracted) {
        console.warn('Autoplay prevented: User interaction required')
        setAutoplayBlocked(true)
        setError('Click anywhere to enable audio playback')
        return
      }

      playPromiseRef.current = audio.play()
      if (playPromiseRef.current !== undefined) {
        playPromiseRef.current.catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Play error:', err)
            
            // Handle specific autoplay errors
            if (err.name === 'NotAllowedError') {
              setAutoplayBlocked(true)
              setError('Audio autoplay is blocked. Click the play button to start.')
            } else if (err.name === 'NotSupportedError') {
              setError('Audio format not supported by your browser')
            } else {
              setError('Failed to play audio: ' + err.message)
            }
          }
          playPromiseRef.current = null
        }).then(() => {
          // Audio started playing successfully
          setAutoplayBlocked(false)
          setError(null)
        })
      }
    } else if (!isPlaying) {
      // Cancel any pending play promise before pausing
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
        playPromiseRef.current = null
      }
      audio.pause()
    }
  }, [isPlaying, hasUserInteracted])

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume / 100
    }
  }, [volume])

  // Handle track changes separately from play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    // Get the expected audio source
    let expectedSrc = null
    if (currentTrack.stream_url) {
      expectedSrc = currentTrack.stream_url
    } else {
      setError('No audio source available for this track')
      setIsLoading(false)
      return
    }

    // Check if this is the same track as currently loaded
    const currentSrc = audio.src
    const isSameTrack = currentSrc && (
      currentSrc === expectedSrc ||
      currentSrc.endsWith(expectedSrc) ||
      expectedSrc.includes(currentSrc.split('/').pop())
    )

    // If it's the same track and audio is already loaded, don't reload
    if (isSameTrack && audio.readyState >= 2) {
      console.log('Same track detected, preserving current position:', audio.currentTime)
      setIsLoading(false)
      setError(null)
      return
    }

    // Cancel any pending play promise when changing tracks
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {})
      playPromiseRef.current = null
    }

    setIsLoading(true)
    setError(null)

    // Set the audio source with validation and fallbacks
    let audioSrc = expectedSrc
    let fallbackSrcs = []

    if (currentTrack.stream_url) {
      // Add fallback URLs if available
      if (currentTrack.fallback_stream_url && currentTrack.fallback_stream_url !== audioSrc) {
        fallbackSrcs.push(currentTrack.fallback_stream_url)
      }
      if (currentTrack.direct_stream_url && currentTrack.direct_stream_url !== audioSrc) {
        fallbackSrcs.push(currentTrack.direct_stream_url)
      }
    }
    
    console.log(`Loading new track: ${currentTrack.title} from ${audioSrc}`)
    if (fallbackSrcs.length > 0) {
      console.log(`Fallback URLs available:`, fallbackSrcs)
    }

    // Function to try loading a specific source
    const tryLoadSource = (src, isRetry = false) => {
      console.log(`${isRetry ? 'Retrying with' : 'Loading'} source: ${src}`)
      audio.src = src
      // Only reset currentTime when loading a completely NEW track
      setCurrentTime(0)
    }

    // Start with the primary source
    tryLoadSource(audioSrc)

    let fallbackIndex = 0
    let hasTriedFallback = false

    // Auto-play when track loads if player is in playing state
    const handleCanPlayThrough = () => {
      setIsLoading(false)
      console.log(`Track loaded successfully: ${currentTrack.title}`)
      console.log(`Audio readyState: ${audio.readyState}`)
      console.log(`Audio duration: ${audio.duration}`)
      console.log(`Audio src: ${audio.src}`)
      
      if (isPlaying) {
        // Check if user has interacted and autoplay is allowed
        if (!hasUserInteracted) {
          console.warn('Autoplay prevented: User interaction required')
          setAutoplayBlocked(true)
          setError('Click anywhere to enable audio playback')
          return
        }

        // Add a small delay to ensure audio is fully ready
        setTimeout(() => {
          if (audio.readyState >= 2) {
            console.log('Attempting to play audio...')
            playPromiseRef.current = audio.play()
            if (playPromiseRef.current !== undefined) {
              playPromiseRef.current.then(() => {
                console.log('Audio playing successfully')
                setAutoplayBlocked(false)
                setError(null)
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  console.error('Auto-play error:', err)
                  
                  if (err.name === 'NotAllowedError') {
                    setAutoplayBlocked(true)
                    setError('Audio autoplay is blocked. Click the play button to start.')
                  } else {
                    setError('Failed to play audio: ' + err.message)
                  }
                }
                playPromiseRef.current = null
              })
            }
          } else {
            console.warn('Audio not ready for playback, readyState:', audio.readyState)
          }
        }, 100)
      }
    }

    const handleLoadError = (e) => {
      console.error(`Failed to load track: ${currentTrack.title} from ${audio.src}`)
      console.error('Audio error details:', e.target.error)
      
      // Try fallback sources if available and not already tried
      if (!hasTriedFallback && fallbackSrcs.length > fallbackIndex) {
        hasTriedFallback = true
        const fallbackSrc = fallbackSrcs[fallbackIndex]
        console.log(`Trying fallback source ${fallbackIndex + 1}/${fallbackSrcs.length}: ${fallbackSrc}`)
        fallbackIndex++
        
        // Remove old event listeners
        audio.removeEventListener('canplaythrough', handleCanPlayThrough)
        audio.removeEventListener('error', handleLoadError)
        
        // Try the fallback source
        tryLoadSource(fallbackSrc, true)
        
        // Re-add event listeners
        audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true })
        audio.addEventListener('error', handleLoadError, { once: true })
        
        return
      }
      
      // All sources failed
      setIsLoading(false)
      setError(`Failed to load: ${currentTrack.title} - No supported audio sources`)
    }

    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true })
    audio.addEventListener('error', handleLoadError, { once: true })

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('error', handleLoadError)
    }
  }, [currentTrack, setCurrentTime, isPlaying, hasUserInteracted])

  const handleProgressClick = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const progressBar = progressRef.current
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value
    setVolume(newVolume)
  }

  const getRepeatIcon = () => {
    switch (repeat) {
      case 'one':
        return 'fas fa-redo'
      case 'all':
        return 'fas fa-redo'
      default:
        return 'fas fa-redo'
    }
  }

  const getRepeatClass = () => {
    return repeat !== 'none' ? 'active' : ''
  }

  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true)
      setAutoplayBlocked(false)
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }

    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  if (!currentTrack) {
    return (
      <div className="player">
        <div className="now-playing">
          <div className="song-info">
            <div className="current-song-image placeholder-image">
              <i className="fas fa-music"></i>
            </div>
            <div className="song-details">
              <h4>No track selected</h4>
              <p>Choose a song to start playing</p>
            </div>
            <button className="like-button disabled">
              <i className="fas fa-heart"></i>
            </button>
          </div>
        </div>
        
        <div className="player-controls">
          <div className="control-buttons">
            <button className={`shuffle ${shuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle">
              <i className="fas fa-random"></i>
            </button>
            <button className="previous" onClick={previousTrack} title="Previous">
              <i className="fas fa-step-backward"></i>
            </button>
            <button className="play-pause disabled" title="Play">
              <i className="fas fa-play"></i>
            </button>
            <button className="next" onClick={nextTrack} title="Next">
              <i className="fas fa-step-forward"></i>
            </button>
            <button className={`repeat ${getRepeatClass()}`} onClick={toggleRepeat} title="Repeat">
              <i className={getRepeatIcon()}></i>
            </button>
          </div>
          <div className="progress-container">
            <span className="current-time">0:00</span>
            <div className="progress-bar" ref={progressRef}>
              <div className="progress" style={{ width: '0%' }}>
                <div className="progress-handle"></div>
              </div>
            </div>
            <span className="total-time">0:00</span>
          </div>
        </div>
        
        <div className="volume-container">
          <button className="volume-button">
            <i className="fas fa-volume-up"></i>
          </button>
          <div className="volume-bar">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <div className="volume-progress" style={{ width: `${volume}%` }}>
              <div className="volume-handle"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="player">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
      
      <div className="now-playing">
        <div className="song-info">
          <div className="current-song-image">
            <img 
              {...getOptimizedImageProps(
                currentTrack.artwork_url || currentTrack.cover_url,
                currentTrack.title,
                '/images/placeholder.jpg'
              )}
            />
            {isLoading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
              </div>
            )}
          </div>
          <div className="song-details">
            <h4 title={currentTrack.title}>{currentTrack.title}</h4>
            <p title={currentTrack.artist}>{currentTrack.artist}</p>
            {error && <span className="error-indicator" title={error}>⚠️</span>}
          </div>
          <button 
            className={`like-button ${isLiked(currentTrack.id) ? 'liked' : ''} ${justLiked ? 'just-liked' : ''}`}
            onClick={async () => {
              try {
                // Visual feedback
                setJustLiked(true)
                setTimeout(() => setJustLiked(false), 400)
                
                // Create enhanced track data for better database storage
                const enhancedTrackData = {
                  title: currentTrack.title || 'Unknown Title',
                  artist: currentTrack.artist || 'Unknown Artist',
                  album: currentTrack.album || currentTrack.title || 'Unknown Album',
                  duration: currentTrack.duration || 180,
                  artwork_url: currentTrack.artwork_url || currentTrack.cover_url,
                  stream_url: currentTrack.stream_url
                }
                
                console.log('❤️ Player like button clicked:', {
                  id: currentTrack.id,
                  original: currentTrack,
                  enhanced: enhancedTrackData
                })
              
                await toggleLike(currentTrack.id, enhancedTrackData)
              } catch (error) {
                console.error('Failed to toggle like:', error)
                // Could show a toast notification here
              }
            }}
            title={isLiked(currentTrack.id) ? 'Remove from liked songs' : 'Add to liked songs'}
          >
            <i className={`${isLiked(currentTrack.id) ? 'fas' : 'far'} fa-heart`}></i>
          </button>
        </div>
      </div>
      
      <div className="player-controls">
        <div className="control-buttons">
          <button 
            className={`shuffle ${shuffle ? 'active' : ''}`} 
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <i className="fas fa-random"></i>
          </button>
          <button 
            className="previous" 
            onClick={previousTrack}
            title="Previous"
          >
            <i className="fas fa-step-backward"></i>
          </button>
          <button 
            className={`play-pause ${isLoading ? 'loading' : ''}`}
            onClick={togglePlayPause}
            title={isPlaying ? "Pause" : "Play"}
            disabled={isLoading || !!error}
          >
            {isLoading ? (
              <div className="button-spinner"></div>
            ) : (
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            )}
          </button>
          <button 
            className="next" 
            onClick={nextTrack}
            title="Next"
          >
            <i className="fas fa-step-forward"></i>
          </button>
          <button 
            className={`repeat ${getRepeatClass()}`} 
            onClick={toggleRepeat}
            title={`Repeat ${repeat}`}
          >
            <i className={getRepeatIcon()}></i>
            {repeat === 'one' && <span className="repeat-one">1</span>}
          </button>
        </div>
        <div className="progress-container">
          <span className="current-time">{formatTime(currentTime)}</span>
          <div 
            className="progress-bar" 
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div 
              className="progress" 
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="progress-handle"></div>
            </div>
          </div>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="volume-container">
        <button className="volume-button" onClick={() => setVolume(volume === 0 ? 70 : 0)}>
          <i className={`fas ${
            volume === 0 ? 'fa-volume-mute' : 
            volume < 50 ? 'fa-volume-down' : 
            'fa-volume-up'
          }`}></i>
        </button>
        <div className="volume-bar">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <div className="volume-progress" style={{ width: `${volume}%` }}>
            <div className="volume-handle"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Player 