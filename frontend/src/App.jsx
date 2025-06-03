import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PlayerProvider } from './contexts/PlayerContext'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Playlists from './pages/Playlists'
import LikedSongs from './pages/LikedSongs'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthSuccess from './pages/AuthSuccess'
import LiveStream from './pages/LiveStream'
import Debug from './pages/Debug'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <Routes>
          {/* Auth routes - no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          
          {/* Main app routes - with layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route 
              path="playlists" 
              element={
                <ProtectedRoute>
                  <Playlists />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="liked-songs" 
              element={
                <ProtectedRoute>
                  <LikedSongs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route path="live-stream" element={<LiveStream />} />
            <Route path="debug" element={<Debug />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PlayerProvider>
    </AuthProvider>
  )
}

export default App 