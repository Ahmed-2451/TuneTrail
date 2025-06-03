import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const TopBar = () => {
  const { isAuthenticated, getDisplayName, getUserInitials, logout, showToast } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out?')
    if (confirmed) {
      setDropdownOpen(false)
      logout()
    }
  }

  const handleSettings = () => {
    showToast('Settings page coming soon!', 'info')
    setDropdownOpen(false)
  }

  const handleProfile = () => {
    setDropdownOpen(false)
    navigate('/profile')
  }

  return (
    <div className="topbar">
      <div className="prev-next-buttons">
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none' }}
        >
          <i className="fas fa-bars"></i>
        </button>
        <button 
          className="hover-effect" 
          onClick={() => window.history.back()}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <button 
          className="hover-effect" 
          onClick={() => window.history.forward()}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="navbar">
        <ul>
          <li>
            <a href="#" className="hover-effect">Premium</a>
          </li>
          <li>
            <a href="#" className="hover-effect">Download</a>
          </li>
          <li className="divider">|</li>
        </ul>
        <div className="navbar-right">
          {isAuthenticated ? (
            <div className={`user-menu ${dropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
              <button 
                className="user-menu-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar">
                  {getUserInitials(getDisplayName())}
                </div>
                <span>{getDisplayName()}</span>
                <i className="fas fa-chevron-down dropdown-arrow"></i>
              </button>
              <div className="user-dropdown">
                <button onClick={handleProfile}>
                  <i className="fas fa-user"></i>
                  Profile
                </button>
                <button onClick={handleSettings}>
                  <i className="fas fa-cog"></i>
                  Settings
                </button>
                <button onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="login-btn">
              <i className="fas fa-sign-in-alt"></i>
              Log In
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default TopBar 