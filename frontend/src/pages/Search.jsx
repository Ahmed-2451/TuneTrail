import React, { useState, useEffect } from 'react'
import { usePlayer } from '../contexts/PlayerContext'
import { getThemedTrackImage } from '../utils/trackImageUtils'

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { playTrack, currentTrack, isPlaying, toggleLike, likedSongs } = usePlayer()

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
    </div>
  )
}

export default Search