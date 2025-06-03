import React, { useRef, useState } from 'react'

const AudioTest = () => {
  const audioRef = useRef(null)
  const [status, setStatus] = useState('Ready to test')
  const [canPlay, setCanPlay] = useState(false)

  // Test with a simple audio file or URL
  const testUrls = [
    '/api/test-audio', // Our generated test audio
    'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Simple test audio
    '/api/audius/stream/kZyw38N', // Example Audius stream
  ]

  const testAudio = async (url) => {
    setStatus(`Testing: ${url}`)
    const audio = audioRef.current
    
    if (!audio) {
      setStatus('Audio element not found')
      return
    }

    try {
      audio.src = url
      
      audio.addEventListener('loadstart', () => {
        setStatus('Loading started...')
      }, { once: true })
      
      audio.addEventListener('canplay', () => {
        setStatus('Audio ready to play!')
        setCanPlay(true)
      }, { once: true })
      
      audio.addEventListener('error', (e) => {
        setStatus(`Error loading audio: ${e.target.error?.message || 'Unknown error'}`)
        setCanPlay(false)
      }, { once: true })
      
      // Load the audio
      audio.load()
      
    } catch (error) {
      setStatus(`Test failed: ${error.message}`)
    }
  }

  const playAudio = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      setStatus('Attempting to play...')
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setStatus('Audio playing! 🎵')
          setTimeout(() => {
            audio.pause()
            setStatus('Audio paused')
          }, 3000)
        }).catch(err => {
          setStatus(`Play failed: ${err.name} - ${err.message}`)
        })
      }
    } catch (error) {
      setStatus(`Play error: ${error.message}`)
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #333', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#1a1a1a',
      color: 'white'
    }}>
      <h3>Audio Test Component</h3>
      <p>Status: <span style={{ color: '#1DB954' }}>{status}</span></p>
      
      <div style={{ marginBottom: '10px' }}>
        {testUrls.map((url, index) => {
          const labels = [
            'Test Generated Audio',
            'Test External Audio', 
            'Test Audius Stream'
          ]
          return (
            <button 
              key={index}
              onClick={() => testAudio(url)}
              style={{
                padding: '8px 12px',
                margin: '5px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {labels[index]}
            </button>
          )
        })}
      </div>
      
      <button 
        onClick={playAudio}
        disabled={!canPlay}
        style={{
          padding: '10px 20px',
          backgroundColor: canPlay ? '#1DB954' : '#666',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: canPlay ? 'pointer' : 'not-allowed'
        }}
      >
        {canPlay ? 'Play Audio' : 'Not Ready'}
      </button>
      
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  )
}

export default AudioTest 