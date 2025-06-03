import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { getThemedTrackImage, getThemedTrackThumbnail } from '../utils/trackImageUtils'

const Search = () => {
  const { isAuthenticated } = useAuth()
  const { playTrack, currentTrack, isPlaying, toggleLike, likedSongs } = usePlayer()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userPlaylists, setUserPlaylists] = useState([])
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(null)

  const categories = [
    { title: 'Podcasts', color: '#1DB954', image: 'podcasts' },
    { title: 'Made For You', color: '#E22856', image: 'made-for-you' },
    { title: 'Charts', color: '#8D67AB', image: 'charts' },
    { title: 'New Releases', color: '#BC5900', image: 'new-releases' },
    { title: 'Discover', color: '#27856A', image: 'discover' },
    { title: 'Concerts', color: '#7D4F39', image: 'concerts' },
    { title: 'Mood', color: '#D84000', image: 'mood-music' },
    { title: 'Party', color: '#E61E32', image: 'party' },
    { title: 'Rock', color: '#DC148C', image: 'rock-music' },
    { title: 'Hip Hop', color: '#BA5D07', image: 'hiphop' },
    { title: 'Pop', color: '#148A08', image: 'pop-music' },
    { title: 'Indie', color: '#0D73EC', image: 'indie' },
  ]

  useEffect(() => {
    // Load user playlists from localStorage
    const savedPlaylists = localStorage.getItem('userPlaylists')
    if (savedPlaylists) {
      setUserPlaylists(JSON.parse(savedPlaylists))
    }
  }, [])

  // Auto-search with debouncing
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const delayedSearch = setTimeout(() => {
        performSearch(searchQuery.trim())
      }, 500) // 500ms debounce
      
      return () => clearTimeout(delayedSearch)
    } else {
      // Clear results when search is empty
      setSearchResults([])
      setError(null)
    }
  }, [searchQuery])

  const performSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log(`🔍 Searching for: ${query}`)
      const response = await fetch(`/api/audius/search?query=${encodeURIComponent(query)}&limit=50`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Search results:', data)
      
      if (data.success && data.data && Array.isArray(data.data)) {
        setSearchResults(data.data)
        console.log(`✅ Found ${data.data.length} tracks`)
        
        if (data.data.length === 0) {
          setError('No tracks found. Try different keywords.')
        }
      } else {
        setSearchResults([])
        setError('No tracks found')
      }
    } catch (error) {
      console.error('Search error:', error)
      setError(`Search failed: ${error.message}`)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
    }
  }

  const handlePlayTrack = (track) => {
    console.log('▶️ Playing track:', track.title)
    playTrack(track, searchResults)
  }

  const handleLikeTrack = (track) => {
    console.log('❤️ Toggling like for track:', {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || track.title || 'Unknown Album',
      duration: track.duration,
      artwork_url: track.artwork_url
    })
    
    // Create enhanced trackData object for external tracks
    const trackData = {
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || track.title || 'Unknown Album', // Use title as album fallback
      duration: track.duration || 180,
      artwork_url: track.artwork_url,
      stream_url: track.stream_url
    }
    
    toggleLike(track.id, trackData)
  }

  const isLiked = (trackId) => {
    return likedSongs.has(trackId)
  }

  const handleAddToPlaylist = async (track, playlistId) => {
    try {
      // Check if track already exists in playlist
      const playlist = userPlaylists.find(p => p.id === playlistId)
      if (!playlist) {
        alert('Playlist not found')
        return
      }

      const trackExists = playlist.tracks?.some(t => t.id === track.id)
      if (trackExists) {
        alert(`"${track.title}" is already in "${playlist.name}"`)
        setShowPlaylistDropdown(null)
        return
      }

      // Send to backend
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update local state with backend response
        const updatedPlaylists = userPlaylists.map(playlist => {
          if (playlist.id === playlistId) {
            return result.data
          }
          return playlist
        })

        // Update localStorage
        localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists))
        setUserPlaylists(updatedPlaylists)
        setShowPlaylistDropdown(null)
        
        // Show success message
        alert(result.message || `Added "${track.title}" to "${playlist.name}"!`)
      } else {
        // Fallback to localStorage if backend fails
        console.warn('Backend failed, using localStorage fallback:', result.error)
        
        const newTrack = {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album || track.title || 'Unknown Album',
          duration: track.duration || 180,
          artwork_url: track.artwork_url,
          stream_url: track.stream_url,
          addedAt: new Date().toISOString()
        }

        const updatedPlaylists = userPlaylists.map(playlist => {
          if (playlist.id === playlistId) {
            return {
              ...playlist,
              tracks: [...playlist.tracks, newTrack],
              trackCount: playlist.tracks.length + 1,
              duration: playlist.duration + (track.duration || 180),
              updatedAt: new Date().toISOString()
            }
          }
          return playlist
        })

        // Save to localStorage
        localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists))
        setUserPlaylists(updatedPlaylists)
        setShowPlaylistDropdown(null)
        
        // Show success message
        const playlistName = updatedPlaylists.find(p => p.id === playlistId)?.name
        alert(`Added "${track.title}" to "${playlistName}"!`)
      }
    } catch (error) {
      console.error('Error adding to playlist:', error)
      alert('Failed to add song to playlist')
    }
  }

  return (
    <div className="search-container">
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input 
            type="text" 
            className="search-input" 
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {loading && (
            <div className="search-loading">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
          )}
        </div>
      </form>
      
      {error && (
        <div className="search-error">
          <p className="error-text">{error}</p>
        </div>
      )}

      {searchResults.length > 0 ? (
        <div className="search-results">
          <h2 className="primary-text title-large">Search Results ({searchResults.length} tracks)</h2>
          <div className="search-results-list">
            {searchResults.map((track, index) => (
              <div key={track.id} className={`search-result-item ${currentTrack?.id === track.id ? 'playing' : ''}`}>
                <div className="result-image">
                  <img 
                    src={getThemedTrackImage(track)} 
                    alt={track.title}
                    onError={(e) => {
                      e.target.src = getThemedTrackImage(track)
                    }}
                  />
                  <div className="play-overlay" onClick={() => handlePlayTrack(track)}>
                    <i className={`fas ${
                      currentTrack?.id === track.id && isPlaying 
                        ? 'fa-pause' 
                        : 'fa-play'
                    }`}></i>
                  </div>
                </div>
                <div className="result-info">
                  <h3 className="primary-text" title={track.title}>{track.title}</h3>
                  <p className="secondary-text" title={track.artist}>
                    {track.artist} • {track.genre || 'Music'}
                    {track.play_count && (
                      <span> • {track.play_count.toLocaleString()} plays</span>
                    )}
                  </p>
                </div>
                <div className="result-actions">
                  <button 
                    className={`like-button ${isLiked(track.id) ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLikeTrack(track)
                    }}
                    title={isLiked(track.id) ? 'Remove from liked songs' : 'Add to liked songs'}
                  >
                    <i className="fas fa-heart"></i>
                  </button>

                  {/* Add to Playlist Dropdown */}
                  <div className="playlist-dropdown-container">
                    <button 
                      className="add-to-playlist-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPlaylistDropdown(showPlaylistDropdown === track.id ? null : track.id)
                      }}
                      title="Add to playlist"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    
                    {showPlaylistDropdown === track.id && (
                      <div className="playlist-dropdown">
                        <div className="playlist-dropdown-header">
                          Add to playlist
                        </div>
                        {userPlaylists.length > 0 ? (
                          <div className="playlist-list">
                            {userPlaylists.map(playlist => (
                              <button
                                key={playlist.id}
                                className="playlist-item"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToPlaylist(track, playlist.id)
                                }}
                              >
                                <i className="fas fa-music"></i>
                                <span>{playlist.name}</span>
                                <span className="track-count">({playlist.trackCount} songs)</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="no-playlists">
                            <p>No playlists found</p>
                            <Link to="/playlists" className="create-playlist-link">
                              Create your first playlist
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    className="play-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayTrack(track)
                    }}
                    title={currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                  >
                    <i className={`fas ${
                      currentTrack?.id === track.id && isPlaying 
                        ? 'fa-pause' 
                        : 'fa-play'
                    }`}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="search-results">
          <h2 className="primary-text title-large">Browse all</h2>
          <div className="category-grid">
            {categories.map((category, index) => (
              <div 
                key={index} 
                className="category-card" 
                style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
              >
                <h3 className="category-title">{category.title}</h3>
                <img 
                  src={`https://picsum.photos/seed/${category.image}/100/100`} 
                  alt={category.title} 
                  className="category-image" 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showPlaylistDropdown && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowPlaylistDropdown(null)}
        />
      )}
    </div>
  )
}

export default Search