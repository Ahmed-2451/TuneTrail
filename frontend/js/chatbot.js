function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function initChatbot() {
    // New selectors for popup structure
    const musicChatbotMessages = document.getElementById('musicChatbotMessages');
    const musicChatbotInput = document.getElementById('musicChatbotInput');
    const musicChatbotSend = document.getElementById('musicChatbotSend');
    const musicExportChatBtn = document.getElementById('musicExportChatBtn');
    const musicClearChatBtn = document.getElementById('musicClearChatBtn');

    const generalChatbotMessages = document.getElementById('generalChatbotMessages');
    const generalChatbotInput = document.getElementById('generalChatbotInput');
    const generalChatbotSend = document.getElementById('generalChatbotSend');
    const generalExportChatBtn = document.getElementById('generalExportChatBtn');
    const generalClearChatBtn = document.getElementById('generalClearChatBtn');

    const token = localStorage.getItem('token');

    // Check if token exists
    if (!token) {
        addMessage('Please log in to use the chatbot features.', 'bot', 'music');
        addMessage('Please log in to use the chatbot features.', 'bot', 'general');
        disableChatbot('music');
        disableChatbot('general');
        return;
    }

    // Validate token format
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryDate = new Date(payload.exp * 1000);
        if (expiryDate < new Date()) {
            addMessage('Your session has expired. Please log in again.', 'bot', 'music');
            addMessage('Your session has expired. Please log in again.', 'bot', 'general');
            disableChatbot('music');
            disableChatbot('general');
            return;
        }
    } catch (error) {
        addMessage('There was an issue with your authentication. Please log in again.', 'bot', 'music');
        addMessage('There was an issue with your authentication. Please log in again.', 'bot', 'general');
        disableChatbot('music');
        disableChatbot('general');
        return;
    }

    // Load chat history for both chatbots
    loadChatHistory('music');
    loadChatHistory('general');

    // Set up event listeners for music chatbot
    musicChatbotSend.addEventListener('click', () => sendMessage('music'));
    musicChatbotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage('music');
        }
    });
    musicExportChatBtn.addEventListener('click', () => exportChatHistory('music'));
    musicClearChatBtn.addEventListener('click', () => clearChatHistory('music'));

    // Set up event listeners for general chatbot
    generalChatbotSend.addEventListener('click', () => sendMessage('general'));
    generalChatbotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage('general');
        }
    });
    generalExportChatBtn.addEventListener('click', () => exportChatHistory('general'));
    generalClearChatBtn.addEventListener('click', () => clearChatHistory('general'));

    function sendMessage(type) {
        const elements = getChatbotElements(type);
        const message = elements.input.value.trim();
        if (!message) return;
        elements.input.value = '';
        addMessage(message, 'user', type);
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
        elements.messages.appendChild(typingIndicator);
        elements.messages.scrollTop = elements.messages.scrollHeight;
        fetch(`http://localhost:3001/api/chatbot/${type}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ message })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            if (typingIndicator.parentNode) {
                elements.messages.removeChild(typingIndicator);
            }
            if (!data) throw new Error('Empty response from server');
            if (data && data.message) {
                addMessage(data.message, 'bot', type);
            } else {
                addMessage('Sorry, I received an invalid response. Please try again.', 'bot', type);
            }
        })
        .catch(error => {
            if (typingIndicator.parentNode) {
                elements.messages.removeChild(typingIndicator);
            }
            if (error.message.includes('401') || error.message.includes('Authentication')) {
                addMessage('Your session has expired. Please refresh the page and log in again.', 'bot', type);
                disableChatbot(type);
            } else {
                addMessage('Sorry, I encountered an error. Please try again later.', 'bot', type);
            }
        });
    }

    function addMessage(message, sender, type) {
        const elements = getChatbotElements(type);
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message ${sender}`;
        const avatar = sender === 'user' ?
            '<i class="fas fa-user"></i>' :
            sender === 'system' ?
            '<i class="fas fa-info-circle"></i>' :
            type === 'music' ?
            '<i class="fas fa-music"></i>' :
            '<i class="fas fa-robot"></i>';
        messageElement.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        elements.messages.appendChild(messageElement);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function loadChatHistory(type) {
        if (!localStorage.getItem('token')) return;
        fetch(`http://localhost:3001/api/chatbot/${type}/history`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to load chat history');
            return response.json();
        })
        .then(data => {
            if (data.chatHistory && data.chatHistory.length > 0) {
                const elements = getChatbotElements(type);
                elements.messages.innerHTML = '';
                data.chatHistory.forEach(msg => {
                    const sender = msg.role === 'user' ? 'user' : 'bot';
                    addMessage(msg.content, sender, type);
                });
            } else {
                // Add welcome message if chat history is empty
                const welcomeMessage = type === 'music'
                    ? 'Music assistant ready.'
                    : 'General assistant ready.';
                addMessage(welcomeMessage, 'bot', type);
            }
        })
        .catch(error => {
            // If there's an error loading chat history, show welcome message
            const welcomeMessage = type === 'music'
                ? 'Music assistant ready.'
                : 'General assistant ready.';
            addMessage(welcomeMessage, 'bot', type);
        });
    }

    function exportChatHistory(type) {
        if (!localStorage.getItem('token')) {
            alert('You need to be logged in to export chat history');
            return;
        }
        window.open(`http://localhost:3001/api/chatbot/${type}/export`, '_blank');
    }

    function clearChatHistory(type) {
        if (!localStorage.getItem('token')) {
            alert('You need to be logged in to clear chat history');
            return;
        }
        if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
            fetch(`http://localhost:3001/api/chatbot/${type}/history`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to clear chat history');
                return response.json();
            })
            .then(() => {
                const elements = getChatbotElements(type);
                elements.messages.innerHTML = '';
                const welcomeMessage = type === 'music'
                    ? 'Music assistant ready.'
                    : 'General assistant ready.';
                addMessage(welcomeMessage, 'bot', type);
            })
            .catch(error => {
                alert('Failed to clear chat history. Please try again.');
            });
        }
    }

    function disableChatbot(type) {
        const elements = getChatbotElements(type);
        elements.input.disabled = true;
        elements.send.disabled = true;
    }

    function getChatbotElements(type) {
        return type === 'music' ? {
            messages: musicChatbotMessages,
            input: musicChatbotInput,
            send: musicChatbotSend
        } : {
            messages: generalChatbotMessages,
            input: generalChatbotInput,
            send: generalChatbotSend
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if the new elements exist
    if (document.getElementById('musicChatbotMessages') && document.getElementById('generalChatbotMessages')) {
        initChatbot();
    }
    // Floating button and popup logic
    const openMusicChatbotBtn = document.getElementById('openMusicChatbot');
    const openGeneralChatbotBtn = document.getElementById('openGeneralChatbot');
    const musicChatbotPopup = document.getElementById('musicChatbotPopup');
    const generalChatbotPopup = document.getElementById('generalChatbotPopup');
    const closeMusicChatbotBtn = document.getElementById('closeMusicChatbot');
    const closeGeneralChatbotBtn = document.getElementById('closeGeneralChatbot');

    function closeAllPopups() {
        if (musicChatbotPopup) musicChatbotPopup.classList.remove('active');
        if (generalChatbotPopup) generalChatbotPopup.classList.remove('active');
    }

    if (openMusicChatbotBtn) {
        openMusicChatbotBtn.addEventListener('click', () => {
            closeAllPopups();
            if (musicChatbotPopup) musicChatbotPopup.classList.add('active');
        });
    }
    if (openGeneralChatbotBtn) {
        openGeneralChatbotBtn.addEventListener('click', () => {
            closeAllPopups();
            if (generalChatbotPopup) generalChatbotPopup.classList.add('active');
        });
    }
    if (closeMusicChatbotBtn) closeMusicChatbotBtn.addEventListener('click', closeAllPopups);
    if (closeGeneralChatbotBtn) closeGeneralChatbotBtn.addEventListener('click', closeAllPopups);
});
