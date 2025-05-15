// Common functionality for all pages
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navigation a');
    
    // Set playback source to 'all' when on the homepage
    if ((currentPage === 'index.html' || currentPage === '') && window.playerService) {
        await window.playerService.setPlaybackSource('all');
        
        // If shuffle is on, regenerate the shuffle queue for all tracks
        if (window.playerService.isShuffleOn) {
            window.playerService.generateShuffleQueue();
        }
    }
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.parentElement.classList.add('active');
        }
    });

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.opacity = '0';
        mainContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            mainContainer.style.transition = 'all 0.3s ease';
            mainContainer.style.opacity = '1';
            mainContainer.style.transform = 'translateY(0)';
        }, 100);
    }

    const playlistCards = document.querySelectorAll('.playlist-card');
    playlistCards.forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = 'playlists.html';
        });
    });

    const createPlaylistBtn = document.querySelector('.create-playlist-btn');
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', () => {
            window.location.href = 'playlists.html';
        });
    }

    const likeButtons = document.querySelectorAll('.like-button');
    likeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = button.querySelector('i');
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#1db954';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '#b3b3b3';
            }
        });
    });

    const findSongsBtn = document.querySelector('.find-songs-btn');
    if (findSongsBtn) {
        findSongsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'search.html';
        });
    }

    // Check authentication status and update UI
    updateAuthUI();
});

// Update UI based on authentication status
function updateAuthUI() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const authButtons = document.querySelector('.navbar');
    if (authButtons) {
        if (isAuthenticated && token) {
            // Extract name from email if name is not available
            let displayName = user.name;
            if (!displayName && user.email) {
                // Use the part before @ in the email as the name
                displayName = user.email.split('@')[0];
                // Capitalize first letter
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            }
            
            // User is logged in
            authButtons.innerHTML = `
                <ul>
                    <li>
                        <a href="#">Premium</a>
                    </li>
                    <li>
                        <a href="#">Download</a>
                    </li>
                    <li class="divider">|</li>
                    <li>
                        <a href="userprofile.html" id="profile-link" style="display: flex; align-items: center; gap: 8px;">
                            <img src="${user.profileImage || 'images/defaultpfp.jpg'}" alt="Profile" style="width: 28px; height: 28px; border-radius: 50%;">
                            <span>${displayName || 'User'}</span>
                        </a>
                    </li>
                </ul>
                <button type="button" onclick="handleLogout()">Log Out</button>
            `;
        } else {
            // User is not logged in
            authButtons.innerHTML = `
                <ul>
                    <li>
                        <a href="signup.html">Sign Up</a>
                    </li>
                    <li class="divider">|</li>
                </ul>
                <button type="button" onclick="window.location.href='login.html'">Log In</button>
            `;
        }
    }
}

function handleLogout() {
    // Clear authentication data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// API request helper with authentication
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    // Add authorization header if token exists
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    try {
        const response = await fetch(`${config.API_URL}${endpoint}`, options);
        
        // Handle 401 Unauthorized (token expired or invalid)
        if (response.status === 401) {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API request error:', error);
        return null;
    }
}

class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentSong = null;
        this.initializeControls();
        this.loadPlaybackState();
    }

    async initializeControls() {
        // Play/Pause
        document.querySelector('.play-pause').addEventListener('click', () => this.togglePlay());
        
        // Next/Previous
        document.querySelector('.next').addEventListener('click', () => this.playNext());
        document.querySelector('.previous').addEventListener('click', () => this.playPrevious());
        
        // Volume
        document.querySelector('.volume-slider').addEventListener('click', (e) => this.handleVolumeChange(e));
        document.querySelector('.volume-button').addEventListener('click', () => this.toggleMute());
        
        // Progress
        document.querySelector('.progress-bar').addEventListener('click', (e) => this.handleProgressClick(e));
        
        // Shuffle/Repeat
        document.querySelector('.shuffle').addEventListener('click', () => this.toggleShuffle());
        document.querySelector('.repeat').addEventListener('click', () => this.toggleRepeat());
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
    }

    async loadPlaybackState() {
        try {
            const response = await apiRequest('/playback-state');
            if (!response) return;
            
            const state = await response.json();
            
            // Restore volume
            this.setVolume(state.volume);
            
            // Restore shuffle/repeat states
            document.querySelector('.shuffle').classList.toggle('active', state.shuffle);
            document.querySelector('.repeat').classList.toggle('active', state.repeat !== 'none');
            
            // Restore current song if any
            if (state.currentSongId) {
                await this.loadSong(state.currentSongId);
                this.audio.currentTime = state.currentTime;
                if (state.isPlaying) this.play();
            }
        } catch (error) {
            console.error('Error loading playback state:', error);
        }
    }

    async loadSong(songId) {
        try {
            const response = await apiRequest(`/songs/${songId}`);
            if (!response) return;
            
            const song = await response.json();
            
            this.currentSong = song;
            this.audio.src = song.audioFile;
            
            // Update UI
            document.querySelector('.song-details h4').textContent = song.title;
            document.querySelector('.song-details p').textContent = song.artist;
            document.querySelector('.current-song-image').src = song.coverImage;
            
            // Update play count
            await apiRequest(`/songs/${songId}/play`, { method: 'PUT' });
            
            // Save state
            this.savePlaybackState();
        } catch (error) {
            console.error('Error loading song:', error);
        }
    }

    async togglePlay() {
        if (this.audio.paused) {
            await this.play();
        } else {
            await this.pause();
        }
    }

    async play() {
        await this.audio.play();
        document.querySelector('.play-pause i').classList.replace('fa-play', 'fa-pause');
        this.savePlaybackState();
    }

    async pause() {
        this.audio.pause();
        document.querySelector('.play-pause i').classList.replace('fa-pause', 'fa-play');
        this.savePlaybackState();
    }

    async handleVolumeChange(e) {
        const slider = e.currentTarget;
        const rect = slider.getBoundingClientRect();
        const volume = (e.clientX - rect.left) / rect.width;
        await this.setVolume(volume);
    }

    async setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
        document.querySelector('.volume-progress').style.width = `${volume * 100}%`;
        this.savePlaybackState();
    }

    updateProgress() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        document.querySelector('.progress').style.width = `${progress}%`;
        
        // Update time displays
        document.querySelector('.current-time').textContent = this.formatTime(this.audio.currentTime);
        document.querySelector('.total-time').textContent = this.formatTime(this.audio.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async handleProgressClick(e) {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
        this.savePlaybackState();
    }

    async savePlaybackState() {
        try {
            await apiRequest('/playback-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentSongId: this.currentSong?.id,
                    currentTime: this.audio.currentTime,
                    isPlaying: !this.audio.paused,
                    volume: this.audio.volume,
                    shuffle: document.querySelector('.shuffle').classList.contains('active'),
                    repeat: document.querySelector('.repeat').classList.contains('active') ? 'all' : 'none'
                })
            });
        } catch (error) {
            console.error('Error saving playback state:', error);
        }
    }
}

// Initialize audio player when document loads
document.addEventListener('DOMContentLoaded', () => {
    window.audioPlayer = new AudioPlayer();
});
