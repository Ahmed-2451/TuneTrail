import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'

const Playlists = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { playTrack, currentTrack, isPlaying, getLikedSongsCount } = usePlayer()
  
  const [playlists, setPlaylists] = useState([])
  const [likedSongsCount, setLikedSongsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [editPlaylistName, setEditPlaylistName] = useState('')
  const [editPlaylistDescription, setEditPlaylistDescription] = useState('')
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    loadPlaylists()
    loadLikedSongsCount()
  }, [isAuthenticated])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      
      // Load playlists from localStorage or API
      const savedPlaylists = localStorage.getItem('userPlaylists')
      if (savedPlaylists) {
        setPlaylists(JSON.parse(savedPlaylists))
      } else {
        setPlaylists([])
      }
      
    } catch (error) {
      console.error('Error loading playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLikedSongsCount = async () => {
    try {
      if (user?.id) {
        const likedResponse = await fetch(`/api/users/${user.id}/liked-songs`)
        if (likedResponse.ok) {
          const likedData = await likedResponse.json()
          setLikedSongsCount(likedData.length)
        }
      }
    } catch (error) {
      console.error('Error loading liked songs count:', error)
      setLikedSongsCount(getLikedSongsCount() || 0)
    }
  }

  const savePlaylistsToStorage = (updatedPlaylists) => {
    localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists))
    setPlaylists(updatedPlaylists)
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: newPlaylistDescription.trim() || 'No description',
      tracks: [],
      trackCount: 0,
      duration: 0,
      artwork_url: null,
      isPublic: newPlaylistPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: user?.name || 'You'
    }
    
    const updatedPlaylists = [newPlaylist, ...playlists]
    savePlaylistsToStorage(updatedPlaylists)
    
    setNewPlaylistName('')
    setNewPlaylistDescription('')
    setNewPlaylistPublic(true)
    setShowCreateModal(false)
  }

  const handleEditPlaylist = async () => {
    if (!editPlaylistName.trim() || !selectedPlaylist) return
    
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === selectedPlaylist.id 
        ? {
            ...playlist,
            name: editPlaylistName.trim(),
            description: editPlaylistDescription.trim() || 'No description',
            updatedAt: new Date().toISOString()
          }
        : playlist
    )
    
    savePlaylistsToStorage(updatedPlaylists)
    
    setEditPlaylistName('')
    setEditPlaylistDescription('')
    setSelectedPlaylist(null)
    setShowEditModal(false)
  }

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return
    
    const updatedPlaylists = playlists.filter(playlist => playlist.id !== selectedPlaylist.id)
    savePlaylistsToStorage(updatedPlaylists)
    
    setSelectedPlaylist(null)
    setShowDeleteModal(false)
  }

  const openEditModal = (playlist) => {
    setSelectedPlaylist(playlist)
    setEditPlaylistName(playlist.name)
    setEditPlaylistDescription(playlist.description)
    setShowEditModal(true)
  }

  const openDeleteModal = (playlist) => {
    setSelectedPlaylist(playlist)
    setShowDeleteModal(true)
  }

  const togglePlaylistVisibility = (playlistId) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, isPublic: !playlist.isPublic, updatedAt: new Date().toISOString() }
        : playlist
    )
    savePlaylistsToStorage(updatedPlaylists)
  }

  const getPlaylistImage = (playlist) => {
    if (playlist.artwork_url) return playlist.artwork_url
    
    // Create a themed playlist cover based on name
    const firstLetter = playlist.name.charAt(0).toUpperCase()
    const colors = [
      ['#8b5cf6', '#ec4899'], // Purple to Pink
      ['#10b981', '#06b6d4'], // Emerald to Cyan
      ['#f59e0b', '#ef4444'], // Amber to Red
      ['#6366f1', '#8b5cf6'], // Indigo to Purple
      ['#ec4899', '#f59e0b'], // Pink to Amber
    ]
    
    const colorIndex = playlist.name.charCodeAt(0) % colors.length
    const [color1, color2] = colors[colorIndex]
    
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="playlistGrad${playlist.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow${playlist.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <rect width="300" height="300" fill="url(#playlistGrad${playlist.id})" rx="16"/>
        
        <g transform="translate(150, 150)" filter="url(#shadow${playlist.id})">
          <circle cx="0" cy="0" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <text x="0" y="15" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="bold" 
                text-anchor="middle" fill="white" opacity="0.95">${firstLetter}</text>
        </g>
        
        <!-- Music playlist lines -->
        <g opacity="0.2">
          <rect x="60" y="90" width="40" height="4" fill="white" rx="2"/>
          <rect x="60" y="105" width="60" height="4" fill="white" rx="2"/>
          <rect x="60" y="120" width="45" height="4" fill="white" rx="2"/>
          <rect x="60" y="135" width="55" height="4" fill="white" rx="2"/>
          
          <rect x="60" y="165" width="50" height="4" fill="white" rx="2"/>
          <rect x="60" y="180" width="35" height="4" fill="white" rx="2"/>
          <rect x="60" y="195" width="65" height="4" fill="white" rx="2"/>
          <rect x="60" y="210" width="40" height="4" fill="white" rx="2"/>
        </g>
      </svg>
    `)}`
  }

  const getLikedSongsPlaylistImage = () => {
    // Create a heart-themed cover for liked songs
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="likedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e91e63;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f06292;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="300" height="300" fill="url(#likedGrad)" rx="16"/>
        <g transform="translate(150, 150)">
          <path d="M0,-30 C-25,-55 -65,-55 -65,-15 C-65,25 0,60 0,60 C0,60 65,25 65,-15 C65,-55 25,-55 0,-30 Z" 
                fill="rgba(255,255,255,0.9)" />
        </g>
        <g opacity="0.15">
          <circle cx="75" cy="90" r="3" fill="white"/>
          <circle cx="105" cy="68" r="2" fill="white"/>
          <circle cx="195" cy="83" r="3" fill="white"/>
          <circle cx="225" cy="105" r="2" fill="white"/>
          <circle cx="90" cy="210" r="2" fill="white"/>
          <circle cx="210" cy="203" r="3" fill="white"/>
        </g>
      </svg>
    `)}`
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0 min'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours} hr ${minutes} min`
    }
    return `${minutes} min`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="playlists-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your playlists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="playlists-container">
      {/* Header */}
      <div className="playlists-header">
        <div className="header-content">
          <h1 className="page-title">Your Library</h1>
          <p className="page-subtitle">Playlists and liked songs</p>
        </div>
        <button 
          className="btn-primary create-playlist-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fas fa-plus"></i>
          Create Playlist
        </button>
      </div>

      {/* Playlists Grid */}
      <div className="playlists-content">
        <div className="playlists-grid">
          {/* Liked Songs Playlist */}
          <Link to="/liked-songs" className="playlist-card special-playlist">
            <div className="playlist-image">
              <img 
                src={getLikedSongsPlaylistImage()} 
                alt="Liked Songs"
              />
              <div className="play-overlay">
                <i className="fas fa-play"></i>
              </div>
            </div>
            <div className="playlist-info">
              <h3 className="playlist-name">Liked Songs</h3>
              <p className="playlist-description">Your favorite tracks</p>
              <div className="playlist-stats">
                <span className="track-count">{likedSongsCount} songs</span>
              </div>
              <div className="playlist-meta">
                <span className="visibility">
                  <i className="fas fa-heart"></i>
                  Made for you
                </span>
              </div>
            </div>
          </Link>

          {/* User Created Playlists */}
          {playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-card">
              <div className="playlist-image">
                <img 
                  src={getPlaylistImage(playlist)} 
                  alt={playlist.name}
                />
                <div className="play-overlay">
                  <i className="fas fa-play"></i>
                </div>
                <div className="playlist-actions">
                  <div className="dropdown">
                    <button className="action-btn dropdown-toggle" title="More options">
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                    <div className="dropdown-menu">
                      <button onClick={() => openEditModal(playlist)}>
                        <i className="fas fa-edit"></i> Edit Details
                      </button>
                      <button onClick={() => togglePlaylistVisibility(playlist.id)}>
                        <i className={`fas ${playlist.isPublic ? 'fa-lock' : 'fa-globe'}`}></i>
                        Make {playlist.isPublic ? 'Private' : 'Public'}
                      </button>
                      <button onClick={() => openDeleteModal(playlist)} className="danger">
                        <i className="fas fa-trash"></i> Delete Playlist
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="playlist-info">
                <h3 className="playlist-name">{playlist.name}</h3>
                <p className="playlist-description">{playlist.description}</p>
                <div className="playlist-stats">
                  <span className="track-count">{playlist.trackCount} songs</span>
                  {playlist.duration > 0 && (
                    <>
                      <span className="separator">•</span>
                      <span className="duration">{formatDuration(playlist.duration)}</span>
                    </>
                  )}
                </div>
                <div className="playlist-meta">
                  <span className="visibility">
                    <i className={`fas ${playlist.isPublic ? 'fa-globe' : 'fa-lock'}`}></i>
                    {playlist.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="separator">•</span>
                  <span className="last-updated">Updated {formatDate(playlist.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {playlists.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-music"></i>
            </div>
            <h3>Create your first playlist</h3>
            <p>It's easy, we'll help you</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Playlist
            </button>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Playlist</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="playlist-name">Playlist Name</label>
                <input
                  id="playlist-name"
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My Playlist #1"
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="playlist-description">Description (optional)</label>
                <textarea
                  id="playlist-description"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="Add an optional description"
                  rows={3}
                  maxLength={300}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPlaylistPublic}
                    onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Make playlist public
                </label>
                <p className="help-text">Public playlists can be seen by other users</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Playlist Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Playlist</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-playlist-name">Playlist Name</label>
                <input
                  id="edit-playlist-name"
                  type="text"
                  value={editPlaylistName}
                  onChange={(e) => setEditPlaylistName(e.target.value)}
                  placeholder="My Playlist #1"
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-playlist-description">Description (optional)</label>
                <textarea
                  id="edit-playlist-description"
                  value={editPlaylistDescription}
                  onChange={(e) => setEditPlaylistDescription(e.target.value)}
                  placeholder="Add an optional description"
                  rows={3}
                  maxLength={300}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleEditPlaylist}
                disabled={!editPlaylistName.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Playlist Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Playlist</h2>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "<strong>{selectedPlaylist?.name}</strong>"?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={handleDeletePlaylist}
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Playlists 