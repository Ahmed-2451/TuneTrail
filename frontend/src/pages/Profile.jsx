import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { getThemedTrackImage, getThemedTrackThumbnail } from '../utils/trackImageUtils'

const Profile = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { playTrack, currentTrack, isPlaying, toggleLike, isLiked, getLikedSongsCount } = usePlayer()
  
  const [likedTracks, setLikedTracks] = useState([])
  const [userPlaylists, setUserPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [newPlaylistPublic, setNewPlaylistPublic] = useState('public')
  const [editPlaylistName, setEditPlaylistName] = useState('')
  const [editPlaylistDescription, setEditPlaylistDescription] = useState('')
  const fileInputRef = useRef(null)
  const [stats, setStats] = useState({
    totalLikedSongs: 0,
    totalPlaylists: 0,
    totalListeningTime: 0
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    loadUserData()
  }, [isAuthenticated, user])

  // Listen for create playlist events from sidebar
  useEffect(() => {
    const handleCreatePlaylist = () => {
      setShowCreateModal(true)
    }

    window.addEventListener('openCreatePlaylistModal', handleCreatePlaylist)
    return () => {
      window.removeEventListener('openCreatePlaylistModal', handleCreatePlaylist)
    }
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Load liked songs
      if (user?.id) {
        const likedResponse = await fetch(`/api/users/${user.id}/liked-songs`)
        if (likedResponse.ok) {
          const likedData = await likedResponse.json()
          setLikedTracks(likedData)
          
          // Calculate stats
          const totalLikedSongs = likedData.length
          const totalListeningTime = likedData.reduce((acc, track) => acc + (track.duration || 180), 0)
          
          setStats(prev => ({
            ...prev,
            totalLikedSongs,
            totalListeningTime: Math.floor(totalListeningTime / 60) // Convert to minutes
          }))
        }
      }
      
      // Load user playlists from localStorage
      const savedPlaylists = localStorage.getItem('userPlaylists')
      if (savedPlaylists) {
        setUserPlaylists(JSON.parse(savedPlaylists))
        setStats(prev => ({
          ...prev,
          totalPlaylists: JSON.parse(savedPlaylists).length + 1 // +1 for liked songs
        }))
      } else {
        setUserPlaylists([])
        setStats(prev => ({
          ...prev,
          totalPlaylists: 1 // Just liked songs
        }))
      }
      
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePlaylistsToStorage = (updatedPlaylists) => {
    localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists))
    setUserPlaylists(updatedPlaylists)
    setStats(prev => ({
      ...prev,
      totalPlaylists: updatedPlaylists.length + 1 // +1 for liked songs
    }))
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
      isPublic: newPlaylistPublic === 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: user?.name || 'You'
    }
    
    const updatedPlaylists = [newPlaylist, ...userPlaylists]
    savePlaylistsToStorage(updatedPlaylists)
    
    setNewPlaylistName('')
    setNewPlaylistDescription('')
    setNewPlaylistPublic('public')
    setShowCreateModal(false)
  }

  const handleEditPlaylist = async () => {
    if (!editPlaylistName.trim() || !selectedPlaylist) return
    
    const updatedPlaylists = userPlaylists.map(playlist => 
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
    
    const updatedPlaylists = userPlaylists.filter(playlist => playlist.id !== selectedPlaylist.id)
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
    const updatedPlaylists = userPlaylists.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, isPublic: !playlist.isPublic, updatedAt: new Date().toISOString() }
        : playlist
    )
    savePlaylistsToStorage(updatedPlaylists)
  }

  const handlePlayTrack = (track, trackList = likedTracks) => {
    playTrack(track, trackList)
  }

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfilePhoto(e.target.result)
        // Here you would normally upload to server
        console.log('Profile photo updated')
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getLikedSongsPlaylistImage = () => {
    // Create a heart-themed cover for liked songs
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="likedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e91e63;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f06292;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#likedGrad)" rx="12"/>
        <g transform="translate(100, 100)">
          <path d="M0,-20 C-15,-35 -40,-35 -40,-10 C-40,15 0,40 0,40 C0,40 40,15 40,-10 C40,-35 15,-35 0,-20 Z" 
                fill="rgba(255,255,255,0.9)" />
        </g>
        <g opacity="0.15">
          <circle cx="50" cy="60" r="2" fill="white"/>
          <circle cx="70" cy="45" r="1.5" fill="white"/>
          <circle cx="130" cy="55" r="2" fill="white"/>
          <circle cx="150" cy="70" r="1.5" fill="white"/>
          <circle cx="60" cy="140" r="1.5" fill="white"/>
          <circle cx="140" cy="135" r="2" fill="white"/>
        </g>
      </svg>
    `)}`
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
        </defs>
        <rect width="300" height="300" fill="url(#playlistGrad${playlist.id})" rx="16"/>
        <g transform="translate(150, 150)">
          <circle cx="0" cy="0" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <text x="0" y="15" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="bold" 
                text-anchor="middle" fill="white" opacity="0.95">${firstLetter}</text>
        </g>
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

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle" onClick={triggerFileInput}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="profile-photo" />
            ) : (
              <i className="fas fa-user"></i>
            )}
            <div className="photo-overlay">
              <i className="fas fa-camera"></i>
              <span>Change photo</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePhotoChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="profile-info">
          <p className="profile-type">Profile</p>
          <h1 className="profile-name">{user?.name || 'Music Lover'}</h1>
          <div className="profile-details">
            <div className="profile-detail-item">
              <span className="detail-label">Username:</span>
              <span className="detail-value">@{user?.username || user?.name?.toLowerCase().replace(' ', '') || 'musiclover'}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user?.email || 'user@example.com'}</span>
            </div>
            <div className="profile-detail-item">
              <span className="detail-label">Full Name:</span>
              <span className="detail-value">{user?.name || 'Music Lover'}</span>
            </div>
          </div>
          <div className="profile-stats">
            <span>{stats.totalPlaylists} playlists</span>
            <span>•</span>
            <span>{stats.totalLikedSongs} liked songs</span>
            <span>•</span>
            <span>{stats.totalListeningTime} minutes of music</span>
          </div>
        </div>
        <div className="profile-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus"></i>
            Create Playlist
          </button>
          <button className="btn-secondary" onClick={logout}>
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>

      {/* Your Playlists Section */}
      <div className="profile-content">
        <div className="playlists-section">
          <div className="section-header">
            <h2>Your Playlists</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i>
              Create Playlist
            </button>
          </div>
          
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
                <p className="playlist-description">Your favorite tracks all in one place</p>
                <div className="playlist-stats">
                  <span>{stats.totalLikedSongs} songs</span>
                  <span>•</span>
                  <span>Made for you</span>
                </div>
              </div>
            </Link>

            {/* User Created Playlists */}
            {userPlaylists.map((playlist) => (
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
                    <span>•</span>
                    <span>{playlist.isPublic ? 'Public' : 'Private'}</span>
                    <span>•</span>
                    <span>Updated {formatDate(playlist.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {userPlaylists.length === 0 && (
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
                <label>Privacy Setting</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="playlist-privacy"
                      value="public"
                      checked={newPlaylistPublic === 'public'}
                      onChange={(e) => setNewPlaylistPublic(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="radio-content">
                      <span className="radio-title">Public</span>
                      <span className="radio-description">Anyone can see this playlist</span>
                    </div>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="playlist-privacy"
                      value="private"
                      checked={newPlaylistPublic === 'private'}
                      onChange={(e) => setNewPlaylistPublic(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="radio-content">
                      <span className="radio-title">Private</span>
                      <span className="radio-description">Only you can see this playlist</span>
                    </div>
                  </label>
                </div>
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

export default Profile 