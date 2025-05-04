// Connect to Socket.IO server
const socket = io('http://localhost:3001');

// UI Elements
const streamerControls = document.getElementById('streamer-controls');
const listenerControls = document.getElementById('listener-controls');
const startStreamBtn = document.getElementById('start-stream');
const stopStreamBtn = document.getElementById('stop-stream');
const joinStreamBtn = document.getElementById('join-stream');
const streamIdDisplay = document.getElementById('stream-id');
const joinStreamInput = document.getElementById('join-stream-id');
const statusDiv = document.getElementById('status');
const messagesDiv = document.createElement('div');
messagesDiv.className = 'stream-messages';
statusDiv.parentNode.insertBefore(messagesDiv, statusDiv.nextSibling);

let currentStreamId = null;
let peers = new Map(); // Store all peer connections
let currentUser = null;

// Get current user's information
async function getCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch('http://localhost:3001/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user profile');
        }

        const data = await response.json();
        currentUser = data.user;
    } catch (error) {
        console.error('Error getting user profile:', error);
        window.location.href = '/login.html';
    }
}

// Update status message
function updateStatus(message) {
    statusDiv.textContent = message;
}

// Add stream message
function addStreamMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'stream-message';
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    // Keep only last 5 messages
    while (messagesDiv.children.length > 5) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }
}

// Generate random stream ID
function generateStreamId() {
    return Math.random().toString(36).substr(2, 9);
}

// Start streaming
async function startStreaming() {
    if (!currentUser) {
        updateStatus('Please log in to start streaming');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        if (stream.getAudioTracks().length === 0) {
            throw new Error('No audio tracks found in the stream');
        }
        
        currentStreamId = generateStreamId();
        streamIdDisplay.textContent = currentStreamId;
        
        socket.emit('start-streaming', { 
            streamId: currentStreamId,
            username: currentUser.username
        });
        
        startStreamBtn.classList.add('hidden');
        stopStreamBtn.classList.remove('hidden');
        listenerControls.classList.add('hidden');
        
        window.localStream = stream;
        
        updateStatus('Streaming started successfully. Share the Stream ID with listeners.');
        addStreamMessage(`Stream started by ${currentUser.username}`);
    } catch (error) {
        updateStatus('Error: ' + error.message);
    }
}

// Stop streaming
function stopStreaming() {
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
        window.localStream = null;
    }
    
    peers.forEach((peer) => peer.destroy());
    peers.clear();
    
    startStreamBtn.classList.remove('hidden');
    stopStreamBtn.classList.add('hidden');
    listenerControls.classList.remove('hidden');
    streamIdDisplay.textContent = '';
    currentStreamId = null;
    updateStatus('Stream ended.');
    addStreamMessage(`Stream ended by ${currentUser.username}`);
    messagesDiv.innerHTML = '';
}

// Join a stream
function joinStream() {
    if (!currentUser) {
        updateStatus('Please log in to join a stream');
        return;
    }

    const streamId = joinStreamInput.value.trim();
    if (!streamId) {
        updateStatus('Please enter a Stream ID.');
        return;
    }
    
    streamerControls.classList.add('hidden');
    socket.emit('join-stream', { 
        streamId: streamId,
        username: currentUser.username
    });
    updateStatus('Connecting to stream...');
}

// Handle stream events
socket.on('user-joined-stream', ({ username, message }) => {
    addStreamMessage(message);
});

socket.on('user-left-stream', ({ username, message }) => {
    addStreamMessage(message);
});

socket.on('stream-ended', ({ message }) => {
    addStreamMessage(message);
    streamerControls.classList.remove('hidden');
    listenerControls.classList.remove('hidden');
    updateStatus('Stream ended by host.');
    peers.forEach((peer) => peer.destroy());
    peers.clear();
});

// Handle new listener joining (streamer side)
socket.on('listener-joined', async ({ listenerId, streamId, username }) => {
    if (currentStreamId !== streamId) return;
    
    const peer = new SimplePeer({
        initiator: true,
        stream: window.localStream,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });
    
    peers.set(listenerId, peer);
    
    peer.on('signal', signal => {
        socket.emit('signal', {
            to: listenerId,
            signal
        });
    });
    
    peer.on('error', err => {
        peers.delete(listenerId);
    });
});

// Handle incoming signals (both sides)
socket.on('signal', async ({ from, signal }) => {
    if (peers.has(from)) {
        peers.get(from).signal(signal);
    } else {
        const peer = new SimplePeer({
            initiator: false,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        peers.set(from, peer);
        
        peer.on('signal', signal => {
            socket.emit('signal', {
                to: from,
                signal
            });
        });
        
        peer.on('stream', stream => {
            const audio = new Audio();
            audio.srcObject = stream;
            audio.autoplay = true;
            audio.volume = 1;
            
            audio.play().catch(error => {
                updateStatus('Error playing audio: ' + error.message);
            });
            updateStatus('Connected to stream successfully!');
        });
        
        peer.on('error', err => {
            peers.delete(from);
            updateStatus('Connection error. Please try again.');
            streamerControls.classList.remove('hidden');
            listenerControls.classList.remove('hidden');
        });
        
        peer.signal(signal);
    }
});

// Event listeners
startStreamBtn.addEventListener('click', startStreaming);
stopStreamBtn.addEventListener('click', stopStreaming);
joinStreamBtn.addEventListener('click', joinStream);

// Initialize
getCurrentUser().then(() => {
    // Show streamer controls if microphone is available
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            streamerControls.classList.remove('hidden');
        })
        .catch(() => {
            updateStatus('No microphone access. You can only join streams.');
        });
}); 