import React from 'react'

const LiveStream = () => {
  return (
    <div className="live-stream-page">
      <div className="live-stream-header">
        <h1 className="primary-text title-large">Live Stream</h1>
        <p className="secondary-text">Discover live music performances and radio stations</p>
      </div>

      <div className="live-stream-content">
        <div className="no-tracks-message text-center py-20">
          <i className="fas fa-broadcast-tower secondary-text" style={{ fontSize: '64px', marginBottom: '24px' }}></i>
          <h2 className="primary-text title-large">Live streaming coming soon!</h2>
          <p className="secondary-text" style={{ marginBottom: '24px' }}>
            We're working on bringing you live music performances and radio stations.
          </p>
          <p className="secondary-text">
            Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  )
}

export default LiveStream 