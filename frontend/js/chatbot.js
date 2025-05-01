function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function initChatbot() {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const exportChatBtn = document.getElementById('export-chat');
    const clearChatBtn = document.getElementById('clear-chat');
    const token = localStorage.getItem('token');
    
    // Check if token exists
    if (!token) {
        console.error('No token found in localStorage');
        addMessage('Please log in to use the chatbot feature.', 'bot');
        chatbotInput.disabled = true;
        chatbotSend.disabled = true;
        return;
    }
    
    // Validate token format
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        // Decode payload (without verification)
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Check if token is expired
        const expiryDate = new Date(payload.exp * 1000);
        if (expiryDate < new Date()) {
            console.error('Token expired at', expiryDate);
            addMessage('Your session has expired. Please log in again.', 'bot');
            chatbotInput.disabled = true;
            chatbotSend.disabled = true;
            return;
        }
        
        console.log('Token valid until', expiryDate);
    } catch (error) {
        console.error('Token validation error:', error);
        addMessage('There was an issue with your authentication. Please log in again.', 'bot');
        chatbotInput.disabled = true;
        chatbotSend.disabled = true;
        return;
    }
    
    // Load chat history if available
    loadChatHistory();
    
    // Send message on button click
    chatbotSend.addEventListener('click', () => {
        sendMessage();
    });
    
    // Send message on Enter key
    chatbotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Export chat history
    exportChatBtn.addEventListener('click', () => {
        exportChatHistory();
    });
    
    // Clear chat history
    clearChatBtn.addEventListener('click', () => {
        clearChatHistory();
    });
    
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;
        
        // Clear input
        chatbotInput.value = '';
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'chatbot-message bot';
        typingIndicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatbotMessages.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        // Debug token
        console.log('Token being used:', token ? `${token.substring(0, 15)}...` : 'No token found');
        
        // Send message to API
        fetch('http://localhost:3001/api/chatbot/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        })
        .then(response => {
            console.log('API Response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('API Error Response:', text);
                    throw new Error('Failed to get response from chatbot: ' + text);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Chatbot API response data:', data);
            // Remove typing indicator
            if (typingIndicator.parentNode) {
                chatbotMessages.removeChild(typingIndicator);
            }
            
            // Validate the response format
            if (!data) {
                throw new Error('Empty response from server');
            }
            
            // Add bot message
            if (data && data.message) {
                addMessage(data.message, 'bot');
            } else {
                console.error('Invalid response format - missing message property:', data);
                addMessage('Sorry, I received an invalid response. Please try again.', 'bot');
            }
        })
        .catch(error => {
            console.error('Chatbot error:', error);
            
            // Remove typing indicator
            if (typingIndicator.parentNode) {
                chatbotMessages.removeChild(typingIndicator);
            }
            
            if (error.message.includes('401') || error.message.includes('Authentication')) {
                addMessage('Your session has expired. Please refresh the page and log in again.', 'bot');
                // Disable further messages
                chatbotInput.disabled = true;
                chatbotSend.disabled = true;
            } else {
                // Add error message
                addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
            }
        });
    }
    
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message ${sender}`;
        
        const avatar = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        chatbotMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function loadChatHistory() {
        if (!token) return;
        
        fetch('http://localhost:3001/api/chatbot/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            return response.json();
        })
        .then(data => {
            if (data.chatHistory && data.chatHistory.length > 0) {
                // Clear initial welcome message
                chatbotMessages.innerHTML = '';
                
                // Add messages from history
                data.chatHistory.forEach(msg => {
                    const sender = msg.role === 'user' ? 'user' : 'bot';
                    addMessage(msg.content, sender);
                });
            }
        })
        .catch(error => {
            console.error('Failed to load chat history:', error);
        });
    }
    
    function exportChatHistory() {
        if (!token) {
            alert('You need to be logged in to export chat history');
            return;
        }
        
        // Open the export URL in a new tab
        window.open('http://localhost:3001/api/chatbot/export', '_blank');
    }
    
    function clearChatHistory() {
        if (!token) {
            alert('You need to be logged in to clear chat history');
            return;
        }
        
        if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
            fetch('http://localhost:3001/api/chatbot/history', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to clear chat history');
                }
                return response.json();
            })
            .then(() => {
                // Clear chat display
                chatbotMessages.innerHTML = '';
                
                // Add welcome message
                addMessage('Hello! I\'m your music assistant. Ask me about song recommendations, creating playlists, or how to use any feature!', 'bot');
            })
            .catch(error => {
                console.error('Failed to clear chat history:', error);
                alert('Failed to clear chat history. Please try again.');
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Get display name from user data
    let displayName = user.name;
    
    // If name is not available, try to get it from email
    if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        // Capitalize first letter
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    
    // If still no display name, use username
    if (!displayName && user.username) {
        displayName = user.username;
    }
    
    // If still no display name, use a default
    if (!displayName) {
        displayName = 'User';
    }
    
    // Update profile information
    document.getElementById('profile-name').textContent = displayName;
    if (user.username) {
        document.getElementById('profile-username').textContent = `@${user.username}`;
    }
    if (user.email) {
        document.getElementById('profile-email').textContent = user.email;
    }
    
    // Update profile image if available
    const profileImage = document.querySelector('.profile-image img');
    if (user.profileImage && profileImage) {
        profileImage.src = user.profileImage;
    }

    // Check if we're on the userprofile page or any page with chatbot elements
    if (document.getElementById('chatbot-messages')) {
        initChatbot();
    }
});
