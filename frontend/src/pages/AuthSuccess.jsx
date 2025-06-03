import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const AuthSuccess = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to home after 3 seconds
    const timer = setTimeout(() => {
      navigate('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <img src="/images/tunetrail-logo.png" alt="TuneTrail" />
            </Link>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '64px', color: 'var(--success-green)', marginBottom: '16px' }}></i>
            </div>
            <h1>Welcome to TuneTrail!</h1>
            <p className="secondary-text">Your account has been successfully created</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p className="secondary-text" style={{ marginBottom: '24px' }}>
              You will be redirected to the home page in a few seconds...
            </p>
            
            <Link to="/" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthSuccess 