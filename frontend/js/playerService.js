/**
 * PlayerService - Singleton audio player service that maintains state across page navigations
 * This ensures music keeps playing smoothly when navigating between different pages
 */
class PlayerService {
    constructor() {
        console.log('PlayerService constructor called');
        
        // Check if we have an existing audio session ID in sessionStorage
        const sessionId = sessionStorage.getItem('audioSessionId');
        
        if (sessionId && window.playerServiceInstance) {
            console.log('Returning existing PlayerService instance');
            return window.playerServiceInstance;
        }
        
        // Create a new session ID if one doesn't exist
        if (!sessionId) {
            sessionStorage.setItem('audioSessionId', Date.now().toString());
            console.log('Created new audio session ID');
        }
        
        console.log('Creating new PlayerService instance');
        
        // Create a shared Audio element
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.tracks = [];
        this.currentTrackIndex = parseInt(localStorage.getItem('currentTrackIndex')) || 0;
        this.currentTime = parseFloat(localStorage.getItem('currentTime')) || 0;
        
        // Save state more frequently to ensure it's preserved
        setInterval(() => {
            if (this.audio && this.audio.currentTime > 0) {
                localStorage.setItem('currentTime', this.audio.currentTime.toString());
            }
        }, 1000);
        
        // Load saved state from localStorage
        this.loadStateFromStorage();
        
        // Set up event listeners
        this.audio.addEventListener('ended', this.handleTrackEnd.bind(this));
        
        // Add visibility change and page unload listener
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Listen for storage events from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (e.key === 'isPlaying' || e.key === 'currentTrackIndex' || e.key === 'currentTime') {
                this.syncStateFromStorage();
            }
        });
        
        // Save reference globally
        window.playerServiceInstance = this;
        
        // Initialize with the current track if available
        this.initializeWithSavedTrack();
    }
    
    /**
     * Initialize with the saved track
     */
    async initializeWithSavedTrack() {
        try {
            // Load tracks first
            await this.loadTracks();
            
            // Get saved state
            const savedTrack = localStorage.getItem('currentTrack');
            const isPlaying = localStorage.getItem('isPlaying') === 'true';
            const savedTime = parseFloat(localStorage.getItem('currentTime')) || 0;
            
            if (savedTrack && this.tracks.length > 0) {
                // Find the track index
                const trackIndex = this.tracks.findIndex(t => t.filename === savedTrack);
                if (trackIndex !== -1) {
                    this.currentTrackIndex = trackIndex;
                    
                    // Load the track without autoplay
                    await this.loadTrack(trackIndex, false);
                    
                    // Set the current time
                    if (savedTime > 0 && this.audio) {
                        this.audio.currentTime = savedTime;
                    }
                    
                    // Play if it was playing before
                    if (isPlaying) {
                        this.play().catch(err => console.error('Error auto-playing track:', err));
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing with saved track:', error);
        }
    }
    
    /**
     * Load the player state from localStorage
     */
    loadStateFromStorage() {
        this.currentTrackIndex = parseInt(localStorage.getItem('currentTrackIndex')) || 0;
        this.volume = parseFloat(localStorage.getItem('volume')) || 1;
        this.audio.volume = this.volume;
        
        // We'll actually load the tracks later when needed
    }
    
    /**
     * Sync state from localStorage (for cross-tab coordination)
     */
    syncStateFromStorage() {
        const isPlaying = localStorage.getItem('isPlaying') === 'true';
        const currentTrackIndex = parseInt(localStorage.getItem('currentTrackIndex')) || 0;
        const currentTime = parseFloat(localStorage.getItem('currentTime')) || 0;
        
        // Only update if there's a change
        if (this.currentTrackIndex !== currentTrackIndex) {
            this.loadTrack(currentTrackIndex, false).then(() => {
                this.audio.currentTime = currentTime;
                if (isPlaying && this.audio.paused) {
                    this.play();
                } else if (!isPlaying && !this.audio.paused) {
                    this.pause();
                }
            });
        } else if (Math.abs(this.audio.currentTime - currentTime) > 3) {
            // Only update time if it's significantly different (>3 seconds)
            this.audio.currentTime = currentTime;
        }
        
        // Update play state if different
        if (isPlaying !== this.isPlaying) {
            if (isPlaying) {
                this.play();
            } else {
                this.pause();
            }
        }
    }
    
    /**
     * Load tracks from the API
     */
    async loadTracks() {
        if (this.tracks.length > 0) {
            return this.tracks;
        }
        
        try {
            const apiUrl = `${config.API_URL}/tracks`;
            console.log('PlayerService: Fetching tracks from API:', apiUrl);
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`PlayerService: Received ${data.length} tracks`);
            
            this.tracks = data.map(track => {
                if (track.duration && typeof track.duration === 'string') {
                    track.duration = parseFloat(track.duration);
                }
                return track;
            });
            
            return this.tracks;
        } catch (error) {
            console.error('PlayerService: Error loading tracks:', error);
            return [];
        }
    }
    
    /**
     * Load and play a specific track
     */
    async loadTrack(index, autoplay = false) {
        if (this.tracks.length === 0) {
            await this.loadTracks();
        }
        
        if (index >= 0 && index < this.tracks.length) {
            const track = this.tracks[index];
            this.currentTrackIndex = index;
            
            // Construct track URL
            const trackUrl = window.location.hostname === 'localhost'
                ? `http://localhost:3001/tracks/${encodeURIComponent(track.filename)}`
                : `/tracks/${encodeURIComponent(track.filename)}`;
                
            console.log(`PlayerService: Loading track ${track.title} at ${trackUrl}`);
            
            // Check if we're already playing this track
            if (this.audio.src.endsWith(encodeURIComponent(track.filename))) {
                if (autoplay && !this.isPlaying) {
                    await this.play();
                }
                return;
            }
            
            // Save current playing state to restore after loading
            const wasPlaying = this.isPlaying;
            
            // Pause before changing src to prevent audio glitches
            this.audio.pause();
            
            // Change the audio source
            this.audio.src = trackUrl;
            this.currentTrack = track;
            
            // Save track info to localStorage
            localStorage.setItem('currentTrack', track.filename);
            localStorage.setItem('currentTrackIndex', index);
            
            // Let subscribers know the track changed
            this.triggerEvent('trackChanged', { track, index });
            
            // If we should autoplay or restore previous playing state
            if (autoplay || wasPlaying) {
                await this.play();
            }
        }
    }
    
    /**
     * Save player state to localStorage
     */
    saveState() {
        if (!this.audio) return;
        
        localStorage.setItem('currentTrackIndex', this.currentTrackIndex);
        localStorage.setItem('isPlaying', this.isPlaying);
        localStorage.setItem('volume', this.audio.volume);
        localStorage.setItem('currentTime', this.audio.currentTime);
        if (this.currentTrack) {
            localStorage.setItem('currentTrack', this.currentTrack.filename);
        }
    }
    
    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Update localStorage when page is hidden
            this.saveState();
        } else if (document.visibilityState === 'visible') {
            // Sync with localStorage when page becomes visible
            this.syncStateFromStorage();
        }
    }
    
    /**
     * Handle track end event
     */
    handleTrackEnd() {
        this.playNext();
    }
    
    /**
     * Play the current track
     */
    async play() {
        try {
            if (!this.audio.src && this.tracks.length > 0) {
                await this.loadTrack(this.currentTrackIndex);
            }
            
            await this.audio.play();
            this.isPlaying = true;
            localStorage.setItem('isPlaying', 'true');
            
            // Let subscribers know playback started
            this.triggerEvent('playbackStateChanged', { isPlaying: true });
            
            return true;
        } catch (error) {
            console.error('PlayerService: Error playing audio:', error);
            return false;
        }
    }
    
    /**
     * Pause the current track
     */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        localStorage.setItem('isPlaying', 'false');
        
        // Let subscribers know playback paused
        this.triggerEvent('playbackStateChanged', { isPlaying: false });
    }
    
    /**
     * Toggle between play and pause
     */
    async togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
        return this.isPlaying;
    }
    
    /**
     * Play the next track
     */
    async playNext() {
        const nextIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        await this.loadTrack(nextIndex, true);
    }
    
    /**
     * Play the previous track
     */
    async playPrevious() {
        const prevIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        await this.loadTrack(prevIndex, true);
    }
    
    /**
     * Set the volume level (0-1)
     */
    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('volume', this.audio.volume);
        this.triggerEvent('volumeChanged', { volume: this.audio.volume });
    }
    
    /**
     * Get current time in the track
     */
    getCurrentTime() {
        return this.audio.currentTime;
    }
    
    /**
     * Get total duration of the track
     */
    getDuration() {
        return this.audio.duration;
    }
    
    /**
     * Simple event system to notify subscribers of changes
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`playerService:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }
    
    /**
     * Subscribe to player events
     */
    subscribe(eventName, callback) {
        document.addEventListener(`playerService:${eventName}`, (e) => callback(e.detail));
    }
}

// Create a single instance of the player service and make it globally available
window.playerService = new PlayerService(); 