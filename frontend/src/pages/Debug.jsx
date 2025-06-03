import React, { useState, useRef } from 'react'
import AudioTest from '../components/AudioTest'

const Debug = () => {
  const [testResults, setTestResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef(null)

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date().toLocaleTimeString() }])
  }

  const testBackendConnection = async () => {
    try {
      const response = await fetch('/api')
      const data = await response.json()
      addResult('Backend Connection', 'success', `Connected: ${data.message}`)
    } catch (error) {
      addResult('Backend Connection', 'error', `Failed: ${error.message}`)
    }
  }

  const testAudiusAPI = async () => {
    try {
      const response = await fetch('/api/audius/status')
      const data = await response.json()
      addResult('Audius API', 'success', `Host: ${data.currentHost}, Status: ${data.currentHostStatus}`)
    } catch (error) {
      addResult('Audius API', 'error', `Failed: ${error.message}`)
    }
  }

  const testTrendingTracks = async () => {
    try {
      const response = await fetch('/api/audius/trending')
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        const track = data.data[0]
        addResult('Trending Tracks', 'success', `Found ${data.data.length} tracks. First: "${track.title}" by ${track.artist}`)
        return track
      } else {
        addResult('Trending Tracks', 'warning', 'No tracks found')
      }
    } catch (error) {
      addResult('Trending Tracks', 'error', `Failed: ${error.message}`)
    }
    return null
  }

  const testAudioStream = async () => {
    const track = await testTrendingTracks()
    if (!track) return

    try {
      // First test our stream URL testing endpoint
      addResult('Stream URL Test', 'info', `Testing stream URLs for track: ${track.id}`)
      
      const testResponse = await fetch(`/api/audius/test-stream/${track.id}`)
      if (testResponse.ok) {
        const testData = await testResponse.json()
        addResult('Stream URL Test', 'info', `Host: ${testData.host}`)
        
        testData.results.forEach((result, index) => {
          if (result.success) {
            addResult('Stream URL Test', 'success', 
              `URL ${index + 1} ✓: ${result.contentType || 'unknown'} (${result.contentLength || 'unknown size'})`)
          } else {
            addResult('Stream URL Test', 'error', 
              `URL ${index + 1} ✗: ${result.error || result.statusText || 'Failed'}`)
          }
        })
        
        if (testData.recommendation && testData.recommendation !== 'No working URL found') {
          addResult('Stream URL Test', 'success', `Best URL: ${testData.recommendation}`)
          
          // Test the recommended URL directly
          try {
            const directTest = await fetch(testData.recommendation, { method: 'HEAD' })
            addResult('Direct Stream Test', directTest.ok ? 'success' : 'error', 
              `Direct test: ${directTest.status} ${directTest.statusText}`)
          } catch (error) {
            addResult('Direct Stream Test', 'error', `Direct test failed: ${error.message}`)
          }
        } else {
          addResult('Stream URL Test', 'error', 'No working stream URLs found')
          return
        }
      }

      // Test if the stream URL responds
      const streamResponse = await fetch(track.stream_url, { method: 'HEAD' })
      if (streamResponse.ok) {
        const contentType = streamResponse.headers.get('content-type')
        addResult('Audio Stream', 'success', 
          `Stream URL accessible: ${track.stream_url} (${contentType || 'unknown type'})`)
        
        // Test audio element
        const audio = audioRef.current
        if (audio) {
          // Clear any previous source
          audio.src = ''
          audio.load()
          
          // Set new source
          audio.src = track.stream_url
          
          const loadTimeout = setTimeout(() => {
            addResult('Audio Element', 'error', 'Audio loading timeout after 10 seconds')
          }, 10000)
          
          audio.addEventListener('loadstart', () => {
            addResult('Audio Element', 'info', 'Loading started')
          }, { once: true })
          
          audio.addEventListener('canplay', () => {
            clearTimeout(loadTimeout)
            addResult('Audio Element', 'success', 'Can play - audio is ready')
          }, { once: true })
          
          audio.addEventListener('error', (e) => {
            clearTimeout(loadTimeout)
            const errorCode = e.target.error?.code
            const errorMessage = e.target.error?.message || 'Unknown error'
            let errorDetails = `Audio error: ${errorMessage}`
            
            // Decode HTML5 audio error codes
            if (errorCode) {
              const errorTypes = {
                1: 'MEDIA_ERR_ABORTED - Loading aborted',
                2: 'MEDIA_ERR_NETWORK - Network error',
                3: 'MEDIA_ERR_DECODE - Decode error',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported'
              }
              errorDetails += ` (Code ${errorCode}: ${errorTypes[errorCode] || 'Unknown error code'})`
            }
            
            addResult('Audio Element', 'error', errorDetails)
          }, { once: true })
          
          // Try to play
          setTimeout(() => {
            try {
              const playPromise = audio.play()
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  addResult('Audio Playback', 'success', 'Audio playing successfully!')
                  setTimeout(() => audio.pause(), 2000) // Stop after 2 seconds
                }).catch(err => {
                  addResult('Audio Playback', 'error', `Play failed: ${err.name} - ${err.message}`)
                })
              }
            } catch (error) {
              addResult('Audio Playback', 'error', `Play error: ${error.message}`)
            }
          }, 1000) // Wait 1 second for loading
        }
      } else {
        addResult('Audio Stream', 'error', 
          `Stream not accessible: ${streamResponse.status} ${streamResponse.statusText}`)
      }
    } catch (error) {
      addResult('Audio Stream', 'error', `Stream test failed: ${error.message}`)
    }
  }

  const runAllTests = async () => {
    setIsLoading(true)
    setTestResults([])
    
    await testBackendConnection()
    await testAudiusAPI()
    await testAudioStream()
    
    setIsLoading(false)
  }

  const clearResults = () => {
    setTestResults([])
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
  }

  return (
    <div className="debug-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>TuneTrail Debug Console</h1>
      
      <div className="debug-controls" style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests} 
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isLoading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Clear Results
        </button>
      </div>

      <div className="test-results">
        {testResults.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              borderRadius: '5px',
              backgroundColor: result.status === 'success' ? '#d4edda' : 
                             result.status === 'error' ? '#f8d7da' : 
                             result.status === 'warning' ? '#fff3cd' : '#d1ecf1',
              borderLeft: `4px solid ${result.status === 'success' ? '#28a745' : 
                                     result.status === 'error' ? '#dc3545' : 
                                     result.status === 'warning' ? '#ffc107' : '#17a2b8'}`
            }}
          >
            <strong>[{result.timestamp}] {result.test}:</strong> {result.message}
          </div>
        ))}
      </div>

      {/* Hidden audio element for testing */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Audio Test Component */}
      <AudioTest />
    </div>
  )
}

export default Debug 