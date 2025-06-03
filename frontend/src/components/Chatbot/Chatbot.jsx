import React, { useState, useRef, useEffect } from 'react'
import ApiService from '../../services/api'

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your TuneTrail assistant. I can help you search for music, find trending tracks, discover new artists, and answer questions about using TuneTrail!",
      isBot: true
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isBot: false
    }

    setMessages(prev => [...prev, userMessage])
    const query = inputValue
    setInputValue('')
    setLoading(true)

    try {
      const response = await getBotResponse(query)
      const botResponse = {
        id: Date.now() + 1,
        text: response,
        isBot: true
      }
      setMessages(prev => [...prev, botResponse])
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble processing your request right now. Please try again later.",
        isBot: true
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (action) => {
    const userMessage = {
      id: Date.now(),
      text: action,
      isBot: false
    }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await getBotResponse(action)
      const botResponse = {
        id: Date.now() + 1,
        text: response,
        isBot: true
      }
      setMessages(prev => [...prev, botResponse])
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't process that request.",
        isBot: true
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }

  const getBotResponse = async (message) => {
    const lowerMessage = message.toLowerCase()
    
    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! How can I help you with music today? I can search for tracks, find trending music, or help you navigate TuneTrail."
    }
    
    // Search functionality
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look for')) {
      // Extract search query
      const searchTerms = message.replace(/search|find|look for|music|song|track|artist/gi, '').trim()
      
      if (searchTerms.length > 2) {
        try {
          const results = await ApiService.searchAudiusTracks(searchTerms, null, false, 5)
          if (results.success && results.data.length > 0) {
            const trackList = results.data.slice(0, 3).map(track => 
              `• ${track.title} by ${track.artist}`
            ).join('\n')
            
            return `I found some tracks for "${searchTerms}":\n\n${trackList}\n\nYou can find more results on the Search page!`
          } else {
            return `I couldn't find any tracks for "${searchTerms}". Try searching with different keywords or check the Search page for more options.`
          }
        } catch (error) {
          return "I'm having trouble searching right now. You can try using the Search page directly."
        }
      } else {
        return "What would you like to search for? Tell me an artist name, song title, or genre!"
      }
    }
    
    // Trending music
    if (lowerMessage.includes('trending') || lowerMessage.includes('popular') || lowerMessage.includes('hot')) {
      try {
        const results = await ApiService.getAudiusTrending(null, null, 3)
        if (results.success && results.data.length > 0) {
          const trackList = results.data.map(track => 
            `• ${track.title} by ${track.artist}`
          ).join('\n')
          
          return `Here are some trending tracks right now:\n\n${trackList}\n\nCheck out the Home page for more trending music!`
        } else {
          return "I couldn't fetch trending tracks right now. Check the Home page for the latest trending music!"
        }
      } catch (error) {
        return "I'm having trouble getting trending tracks. You can find them on the Home page!"
      }
    }
    
    // Underground/new music
    if (lowerMessage.includes('underground') || lowerMessage.includes('new') || lowerMessage.includes('discover')) {
      try {
        const results = await ApiService.getAudiusUnderground(3)
        if (results.success && results.data.length > 0) {
          const trackList = results.data.map(track => 
            `• ${track.title} by ${track.artist}`
          ).join('\n')
          
          return `Here are some underground/new tracks to discover:\n\n${trackList}\n\nExplore more new music on our platform!`
        } else {
          return "I couldn't fetch underground tracks right now. Try exploring different genres on the Search page!"
        }
      } catch (error) {
        return "I'm having trouble getting new tracks. Try browsing different sections of TuneTrail!"
      }
    }
    
    // Playlist help
    if (lowerMessage.includes('playlist')) {
      return "You can create and manage playlists in the Your Library section. Click on 'Create Playlist' to start building your own music collection!"
    }
    
    // Liked songs
    if (lowerMessage.includes('like') || lowerMessage.includes('favorite') || lowerMessage.includes('heart')) {
      return "You can like songs by clicking the heart icon next to any track. All your liked songs will appear in the 'Liked Songs' section in Your Library."
    }
    
    // How to use TuneTrail
    if (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('guide')) {
      return "Here's how to use TuneTrail:\n\n• Use the Search page to find specific tracks or artists\n• Browse trending music on the Home page\n• Create playlists in Your Library\n• Like songs to save them to your Liked Songs\n• Stream music directly in your browser\n\nWhat would you like to know more about?"
    }
    
    // Genre recommendations
    if (lowerMessage.includes('genre') || lowerMessage.includes('electronic') || lowerMessage.includes('jazz') || lowerMessage.includes('rock') || lowerMessage.includes('hip hop') || lowerMessage.includes('classical')) {
      const genre = lowerMessage.includes('electronic') ? 'Electronic' :
                   lowerMessage.includes('jazz') ? 'Jazz' :
                   lowerMessage.includes('rock') ? 'Rock' :
                   lowerMessage.includes('hip hop') ? 'Hip Hop' :
                   lowerMessage.includes('classical') ? 'Classical' : null
      
      if (genre) {
        try {
          const results = await ApiService.searchAudiusTracks(genre, genre, false, 3)
          if (results.success && results.data.length > 0) {
            const trackList = results.data.map(track => 
              `• ${track.title} by ${track.artist}`
            ).join('\n')
            
            return `Here are some ${genre} tracks you might like:\n\n${trackList}\n\nSearch for "${genre}" to find more!`
          }
        } catch (error) {
          // Fall through to generic response
        }
      }
      
      return "I can help you discover music by genre! Try searching for specific genres like Electronic, Jazz, Rock, Hip Hop, or Classical on the Search page."
    }
    
    // Default response with suggestions
    return "I'm here to help with music! You can ask me to:\n\n• Search for specific songs or artists\n• Show trending music\n• Find new/underground tracks\n• Help with playlists and liked songs\n• Guide you through TuneTrail features\n\nWhat would you like to do?"
  }

  const quickActions = [
    "Show trending music",
    "Find new music",
    "How to create playlist",
    "Search for jazz music"
  ]

  return (
    <div className="chatbot-container">
      <div 
        className="chatbot-toggle" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'}`}></i>
        <div className="chatbot-online-indicator"></div>
      </div>
      
      {isOpen && (
        <div className="chatbot-popup">
          <div className="chatbot-header">
            <h3>TuneTrail Assistant</h3>
            <button 
              className="chatbot-close" 
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`chatbot-message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                <div className="message-content">
                  <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
                </div>
              </div>
            ))}
            
            {messages.length === 1 && (
              <div className="chatbot-quick-actions">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-btn"
                    onClick={() => handleQuickAction(action)}
                    disabled={loading}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            
            {loading && (
              <div className="chatbot-message bot-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chatbot-input-container" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me about music..." 
              disabled={loading}
            />
            <button type="submit" disabled={loading || !inputValue.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Chatbot 