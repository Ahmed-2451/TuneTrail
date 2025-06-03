import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Sidebar = () => {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  const handleCreatePlaylist = () => {
    // Dispatch custom event to trigger create playlist modal
    window.dispatchEvent(new CustomEvent('openCreatePlaylistModal'))
  }

  return (
    <div className="sidebar">
      <div className="logo">
        <Link to="/" className="logo-link">
          <img 
            src="/images/tunetrail-logo.png" 
            alt="TuneTrail Logo" 
            className="logo-image"
          />
          <span className="app-name">TuneTrail</span>
        </Link>
      </div>

      <div className="navigation">
        <ul>
          <li className={isActive('/') ? 'active' : ''}>
            <Link to="/">
              <i className="fas fa-home"></i>
              <span>Home</span>
            </Link>
          </li>
          <li className={isActive('/search') ? 'active' : ''}>
            <Link to="/search">
              <i className="fas fa-search"></i>
              <span>Search</span>
            </Link>
          </li>
          <li className={isActive('/playlists') ? 'active' : ''}>
            <Link to="/playlists">
              <i className="fas fa-book"></i>
              <span>Your Library</span>
            </Link>
          </li>
          <li className={isActive('/live-stream') ? 'active' : ''}>
            <Link to="/live-stream">
              <i className="fas fa-broadcast-tower"></i>
              <span>Live Stream</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="navigation">
        <ul>
          <li>
            <button onClick={handleCreatePlaylist} className="sidebar-button">
              <i className="fas fa-plus-square"></i>
              <span>Create Playlist</span>
            </button>
          </li>
          <li className={isActive('/liked-songs') ? 'active' : ''}>
            <Link to="/liked-songs">
              <i className="fas fa-heart"></i>
              <span>Liked Songs</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Sidebar 