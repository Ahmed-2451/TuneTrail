/**
 * PlayerService - Singleton audio player service that maintains state across page navigations
 * This ensures music keeps playing smoothly when navigating between different pages
 */
class PlayerService {
    constructor() {
        // If an instance already exists in SessionStorage
        if (window.playerServiceInstance) {
            console.log('Returning existing PlayerService instance');
            return window.playerServiceInstance;
        }
        
        console.log('Creating new PlayerService instance');
        
        // Create a shared Audio element
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.tracks = [];
        this.currentTrackIndex = 0;
        
        // Load saved state from localStorage
        this.loadStateFromStorage();
        
        // Set up event listeners
        this.audio.addEventListener('ended', this.handleTrackEnd.bind(this));
        
        // Add visibility change listener to handle tab switching
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Save reference globally
        window.playerServiceInstance = this;
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
            if (this.audio.src === trackUrl) {
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
     * Handle track end event
     */
    handleTrackEnd() {
        this.playNext();
    }
    
    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Update localStorage when page is hidden
            this.saveState();
        }
    }
    
    /**
     * Save player state to localStorage
     */
    saveState() {
        localStorage.setItem('currentTrackIndex', this.currentTrackIndex);
        localStorage.setItem('isPlaying', this.isPlaying);
        localStorage.setItem('volume', this.audio.volume);
        localStorage.setItem('currentTime', this.audio.currentTime);
        if (this.currentTrack) {
            localStorage.setItem('currentTrack', this.currentTrack.filename);
        }
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