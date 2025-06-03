import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const navigate = useNavigate()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('user_data')
        const storedProfilePhoto = localStorage.getItem('user_profile_photo')

        if (storedToken && storedUser) {
          // Basic token validation (check it's not empty and has valid format)
          if (storedToken.length > 10 && storedUser.length > 2) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
            setIsAuthenticated(true)
            
            // Load profile photo if available
            if (storedProfilePhoto) {
              setProfilePhoto(storedProfilePhoto)
            }
            
            // Set the token in API service
            apiService.setAuthToken(storedToken)
            
            console.log('✅ Authentication restored from localStorage')
          } else {
            // Invalid token format, clear auth state
            logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials) => {
    try {
      setIsLoading(true)
      const response = await apiService.login(credentials)
      
      if (response.token && response.user) {
        const { token: authToken, user: userData } = response
        
        // Store in state
        setToken(authToken)
        setUser(userData)
        setIsAuthenticated(true)
        
        // Store in localStorage
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('user_data', JSON.stringify(userData))
        
        // Set token in API service
        apiService.setAuthToken(authToken)
        
        showToast('Login successful!', 'success')
        
        return { success: true, user: userData }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Login failed'
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (userData) => {
    try {
      setIsLoading(true)
      const response = await apiService.signup(userData)
      
      if (response.token && response.user) {
        const { token: authToken, user: userInfo } = response
        
        // Store in state
        setToken(authToken)
        setUser(userInfo)
        setIsAuthenticated(true)
        
        // Store in localStorage
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('user_data', JSON.stringify(userInfo))
        
        // Set token in API service
        apiService.setAuthToken(authToken)
        
        showToast('Account created successfully!', 'success')
        
        return { success: true, user: userInfo }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Signup error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Registration failed'
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    setProfilePhoto(null)
    
    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('user_profile_photo')
    
    // Clear API service token
    apiService.setAuthToken(null)
    
    // Navigate to login
    navigate('/login')
    
    showToast('Logged out successfully', 'info')
  }

  const refreshToken = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token')
      if (!storedToken) return false
      
      // TODO: Implement token refresh API call
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      return false
    }
  }

  // Profile photo management functions
  const updateProfilePhoto = (photoDataUrl) => {
    setProfilePhoto(photoDataUrl)
    localStorage.setItem('user_profile_photo', photoDataUrl)
    showToast('Profile photo updated!', 'success')
  }

  const removeProfilePhoto = () => {
    setProfilePhoto(null)
    localStorage.removeItem('user_profile_photo')
    showToast('Profile photo removed', 'info')
  }

  const getProfilePhotoUrl = () => {
    return profilePhoto
  }

  const getUserInitials = (name) => {
    if (!name) return 'U'
    
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
    }
  }

  const getDisplayName = () => {
    if (!user) return 'User'
    
    let displayName = user.name
    
    if (!displayName && user.email) {
      displayName = user.email.split('@')[0]
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1)
    }
    
    if (!displayName && user.username) {
      displayName = user.username
    }
    
    return displayName || 'User'
  }

  const showToast = (message, type = 'info') => {
    // Remove existing toast
    const existingToast = document.querySelector('.toast')
    if (existingToast) {
      existingToast.remove()
    }

    // Create new toast
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.textContent = message

    // Add to page
    document.body.appendChild(toast)

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100)

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    profilePhoto,
    login,
    signup,
    logout,
    refreshToken,
    updateProfilePhoto,
    removeProfilePhoto,
    getProfilePhotoUrl,
    getUserInitials,
    getDisplayName,
    showToast
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 