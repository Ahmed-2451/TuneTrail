import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { getThemedTrackImage } from '../utils/trackImageUtils'

const Home = () => {
  const { isAuthenticated, user } = useAuth()
  const { playTrack, currentTrack, isPlaying, toggleLike, isLiked } = usePlayer()
  const [trendingTracks, setTrendingTracks] = useState([])
  const [categories] = useState([
    { id: 1, name: 'Electronic', color: '#8b5cf6', icon: 'fas fa-bolt' },
    { id: 2, name: 'Hip-Hop', color: '#ef4444', icon: 'fas fa-microphone' },
    { id: 3, name: 'Rock', color: '#f59e0b', icon: 'fas fa-guitar' },
    { id: 4, name: 'Pop', color: '#10b981', icon: 'fas fa-star' },
    { id: 5, name: 'Jazz', color: '#6366f1', icon: 'fas fa-saxophone' },
    { id: 6, name: 'Classical', color: '#ec4899', icon: 'fas fa-music' }
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTrendingTracks()
  }, [])

  const loadTrendingTracks = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/audius/trending')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        // Take first 8 tracks and ensure they have proper duration formatting
        const formattedTracks = data.data.slice(0, 8).map(track => ({
          ...track,
          duration: formatDuration(track.duration),
          // Preserve original artwork_url without forcing placeholder
          artwork_url: track.artwork_url
        }))
        setTrendingTracks(formattedTracks)
      } else if (data.error) {
        // Handle API errors gracefully
        console.warn('Audius API returned error:', data.error)
        setError(data.message || 'Unable to load trending tracks')
        setTrendingTracks([]) // Set empty array instead of demo tracks
      } else {
        throw new Error('Invalid data format received')
      }
      
    } catch (error) {
      console.error('Failed to load trending tracks:', error)
      setError('Failed to load content. Please try again.')
      
      // Fallback to demo tracks for development
      setTrendingTracks([
        {
          id: 'demo-1',
          title: "Midnight Drive",
          artist: "Neon Dreams",
          duration: "3:24",
          artwork_url: null, // Will use themed fallback
          stream_url: null
        },
        {
          id: 'demo-2', 
          title: "Electric Pulse",
          artist: "SynthWave",
          duration: "4:12",
          artwork_url: null, // Will use themed fallback
          stream_url: null
        },
        {
          id: 'demo-3',
          title: "Digital Horizon", 
          artist: "CyberVibes",
          duration: "3:45",
          artwork_url: null, // Will use themed fallback
          stream_url: null
        },
        {
          id: 'demo-4',
          title: "Neon Nights",
          artist: "RetroWave", 
          duration: "4:33",
          artwork_url: null, // Will use themed fallback
          stream_url: null
        }
      ])
      
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handlePlayTrack = (track) => {
    playTrack(track, trendingTracks)
  }

  const quickAccessItems = [
    {
      id: 1,
      title: 'Liked Songs',
      subtitle: 'Your favorite tracks',
      icon: 'fas fa-heart',
      color: '#ef4444',
      link: '/liked-songs'
    },
    {
      id: 2,
      title: 'Your Playlists',
      subtitle: 'Created by you',
      icon: 'fas fa-list-music',
      color: '#10b981',
      link: '/playlists'
    },
    {
      id: 3,
      title: 'Discover Weekly',
      subtitle: 'Fresh finds for you',
      icon: 'fas fa-compass',
      color: '#8b5cf6',
      link: '/discover'
    },
    {
      id: 4,
      title: 'Recently Played',
      subtitle: 'Jump back in',
      icon: 'fas fa-history',
      color: '#06b6d4',
      link: '/recent'
    }
  ]

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your music...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="page-header">
        <h1 className="page-title">
          Welcome back{user?.name ? `, ${user.name}` : ', ahmed khaled'}!
        </h1>
        <p className="page-subtitle">Ready to discover your next favorite song?</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button onClick={loadTrendingTracks} className="retry-btn">
            <i className="fas fa-redo"></i> Retry
          </button>
        </div>
      )}

      {/* Quick Access */}
      <section className="quick-access mb-8">
        <h2 className="title-medium">Quick Access</h2>
        <div className="quick-access-grid">
          {quickAccessItems.map(item => (
            <Link 
              key={item.id} 
              to={item.link} 
              className="quick-access-card"
              style={{ '--accent-color': item.color }}
            >
              <div className="quick-access-content">
                <div 
                  className="quick-access-image"
                  style={{ backgroundColor: item.color }}
                >
                  <i className={item.icon}></i>
                </div>
                <div className="quick-access-info">
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Tracks */}
      {trendingTracks.length > 0 && (
        <section className="trending-section mb-8">
          <div className="section-header">
            <h2 className="section-title">Trending Now</h2>
            <Link to="/discover" className="view-all-btn">View All</Link>
          </div>
          <div className="track-grid">
            {trendingTracks.map(track => (
              <div 
                key={track.id} 
                className={`track-card ${currentTrack?.id === track.id ? 'playing' : ''}`}
                onClick={() => handlePlayTrack(track)}
              >
                <div className="track-image">
                  <img 
                    src={getThemedTrackImage(track)} 
                    alt={track.title}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = getThemedTrackImage(track)
                    }}
                  />
                  <div className="play-overlay">
                    <i className={`fas ${
                      currentTrack?.id === track.id && isPlaying 
                        ? 'fa-pause' 
                        : 'fa-play'
                    }`}></i>
                  </div>
                </div>
                <div className="track-info">
                  <div className="track-title" title={track.title}>
                    {track.title}
                  </div>
                  <div className="track-artist" title={track.artist}>
                    {track.artist}
                  </div>
                  <div className="track-meta">
                    {track.duration && (
                      <span className="track-duration">
                        {track.duration}
                      </span>
                    )}
                    <button 
                      className={`like-btn ${isLiked(track.id) ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        
                        // Create enhanced track data for better database storage
                        const enhancedTrackData = {
                          title: track.title || 'Unknown Title',
                          artist: track.artist || 'Unknown Artist',
                          album: track.album || track.title || 'Unknown Album', // Use title as album fallback
                          duration: typeof track.duration === 'string' 
                            ? (() => {
                                const [minutes, seconds] = track.duration.split(':').map(Number)
                                return (minutes * 60) + (seconds || 0)
                              })()
                            : track.duration || 180,
                          artwork_url: track.artwork_url,
                          stream_url: track.stream_url
                        }
                        
                        console.log('❤️ Home page like button clicked:', {
                          id: track.id,
                          original: track,
                          enhanced: enhancedTrackData
                        })
                        
                        toggleLike(track.id, enhancedTrackData)
                      }}
                      title={isLiked(track.id) ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                    >
                      <i className="fas fa-heart"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Browse Categories */}
      <section className="categories-section">
        <h2 className="section-title">Browse Categories</h2>
        <div className="category-grid">
          {categories.map(category => (
            <Link
              key={category.id}
              to={`/search?category=${category.name.toLowerCase()}`}
              className="category-card"
              style={{ backgroundColor: category.color }}
            >
              <div className="category-content">
                <h3 className="category-title">{category.name}</h3>
                <div className="category-icon">
                  <i className={category.icon}></i>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home 