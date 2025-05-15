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
        this.isShuffleOn = localStorage.getItem('isShuffleOn') === 'true' || false;
        this.isRepeatOn = localStorage.getItem('isRepeatOn') === 'true' || false;
        this.shuffledIndices = JSON.parse(localStorage.getItem('shuffledIndices')) || [];
        this.playbackSource = localStorage.getItem('playbackSource') || 'all'; // 'all', 'liked'
        this.likedTracks = [];
        
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
            // First determine the playback source
            const savedSource = localStorage.getItem('playbackSource') || 'all';
            
            // Load the appropriate tracks based on the source
            if (savedSource === 'liked') {
                await this.loadLikedTracks();
                if (this.likedTracks.length === 0) {
                    // Fallback to all tracks if no liked tracks are available
                    this.playbackSource = 'all';
                    await this.loadTracks();
                }
            } else {
                await this.loadTracks();
            }
            
            // Get saved state
            const savedTrack = localStorage.getItem('currentTrack');
            const isPlaying = localStorage.getItem('isPlaying') === 'true';
            const savedTime = parseFloat(localStorage.getItem('currentTime')) || 0;
            
            // Initialize shuffle queue if needed
            if (this.isShuffleOn) {
                // Force regeneration of shuffle queue to ensure it's complete and up-to-date
                this.generateShuffleQueue();
            }
            
            // Determine which track list to use
            const activeTracks = this.getActiveTracks();
            
            if (savedTrack && activeTracks.length > 0) {
                // Find the track index
                const trackIndex = activeTracks.findIndex(t => t.filename === savedTrack);
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
                } else {
                    // If the saved track isn't in the current track list, start with the first track
                    if (activeTracks.length > 0) {
                        this.currentTrackIndex = 0;
                    }
                }
            } else if (activeTracks.length > 0) {
                // No saved track, default to the first track
                this.currentTrackIndex = 0;
            }
            
            // Notify subscribers of the current states
            this.triggerEvent('playbackSourceChanged', { source: this.playbackSource });
            this.triggerEvent('shuffleChanged', { isShuffleOn: this.isShuffleOn });
            this.triggerEvent('repeatChanged', { isRepeatOn: this.isRepeatOn });
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
        this.isShuffleOn = localStorage.getItem('isShuffleOn') === 'true' || false;
        this.isRepeatOn = localStorage.getItem('isRepeatOn') === 'true' || false;
        this.shuffledIndices = JSON.parse(localStorage.getItem('shuffledIndices')) || [];
        this.playbackSource = localStorage.getItem('playbackSource') || 'all';
        
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
                // Ensure track duration is a number
                if (track.duration && typeof track.duration === 'string') {
                    track.duration = parseFloat(track.duration);
                }
                
                // Set a default duration if missing or invalid
                if (!track.duration || isNaN(track.duration) || track.duration <= 0) {
                    // Random duration between 2:30 and 4:30 (150-270 seconds)
                    track.duration = Math.floor(Math.random() * (270 - 150 + 1)) + 150;
                    console.log(`Setting default duration for track: ${track.title}, duration: ${track.duration}`);
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
     * Load liked songs from the API
     */
    async loadLikedTracks() {
        try {
            const apiUrl = `${config.API_URL}/liked-songs`;
            console.log('PlayerService: Fetching liked songs from API:', apiUrl);
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`PlayerService: Received ${data.length} liked songs`);
            
            this.likedTracks = data.map(track => {
                // Ensure track duration is a number
                if (track.duration && typeof track.duration === 'string') {
                    track.duration = parseFloat(track.duration);
                }
                
                // Set a default duration if missing or invalid
                if (!track.duration || isNaN(track.duration) || track.duration <= 0) {
                    // Random duration between 2:30 and 4:30 (150-270 seconds)
                    track.duration = Math.floor(Math.random() * (270 - 150 + 1)) + 150;
                    console.log(`Setting default duration for liked track: ${track.title}, duration: ${track.duration}`);
                }
                
                return track;
            });
            
            return this.likedTracks;
        } catch (error) {
            console.error('PlayerService: Error loading liked tracks:', error);
            return [];
        }
    }
    
    /**
     * Set playback source to either all tracks or liked songs
     */
    async setPlaybackSource(source) {
        if (source !== 'all' && source !== 'liked') {
            console.error(`Invalid playback source: ${source}`);
            return;
        }
        
        this.playbackSource = source;
        localStorage.setItem('playbackSource', source);
        
        // Make sure we have the correct tracks loaded
        if (source === 'liked' && this.likedTracks.length === 0) {
            await this.loadLikedTracks();
        } else if (source === 'all' && this.tracks.length === 0) {
            await this.loadTracks();
        }
        
        // If we're changing sources, we need to regenerate shuffle queue
        if (this.isShuffleOn) {
            this.generateShuffleQueue();
        }
        
        // Notify subscribers
        this.triggerEvent('playbackSourceChanged', { source });
    }
    
    /**
     * Get active track list based on current playback source
     */
    getActiveTracks() {
        return this.playbackSource === 'liked' ? this.likedTracks : this.tracks;
    }
    
    /**
     * Load and play a specific track
     */
    async loadTrack(index, autoplay = false) {
        // Determine which track list to use
        let trackList;
        
        if (this.playbackSource === 'liked') {
            if (this.likedTracks.length === 0) {
                await this.loadLikedTracks();
            }
            trackList = this.likedTracks;
        } else {
            if (this.tracks.length === 0) {
                await this.loadTracks();
            }
            trackList = this.tracks;
        }
        
        if (trackList.length === 0) {
            console.error('No tracks available to play');
            return;
        }
        
        if (index >= 0 && index < trackList.length) {
            const track = trackList[index];
            this.currentTrackIndex = index;
            
            // Update shuffled indices if needed
            if (this.isShuffleOn) {
                // If the track is not in our shuffle queue or if we're manually selecting a track
                const shuffleIndex = this.shuffledIndices.indexOf(index);
                if (shuffleIndex === -1) {
                    // Add the track to the beginning of the shuffle queue
                    this.shuffledIndices.unshift(index);
                } else if (shuffleIndex !== 0) {
                    // Move the track to the beginning of the shuffle queue
                    this.shuffledIndices.splice(shuffleIndex, 1);
                    this.shuffledIndices.unshift(index);
                }
                localStorage.setItem('shuffledIndices', JSON.stringify(this.shuffledIndices));
            }
            
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
        localStorage.setItem('isShuffleOn', this.isShuffleOn);
        localStorage.setItem('isRepeatOn', this.isRepeatOn);
        localStorage.setItem('shuffledIndices', JSON.stringify(this.shuffledIndices));
        localStorage.setItem('playbackSource', this.playbackSource);
        
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
        if (this.isRepeatOn) {
            // Repeat the current track
            this.audio.currentTime = 0;
            this.play();
        } else {
            // Always play next track when track ends
            this.playNext();
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
        const activeTracks = this.getActiveTracks();
        
        if (activeTracks.length === 0) return;
        
        let nextIndex;
        
        if (this.isShuffleOn) {
            // Get next track from shuffle queue
            const currentShuffleIndex = this.shuffledIndices.indexOf(this.currentTrackIndex);
            
            if (currentShuffleIndex < this.shuffledIndices.length - 1) {
                // If we have more tracks in the shuffle queue, get the next one
                nextIndex = this.shuffledIndices[currentShuffleIndex + 1];
            } else {
                // If we're at the end of shuffle queue, regenerate shuffle and continue
                this.generateShuffleQueue();
                // Use the first track in the new shuffle queue (avoiding the current track)
                nextIndex = this.shuffledIndices[0];
            }
        } else {
            // Normal sequential playback
            nextIndex = (this.currentTrackIndex + 1) % activeTracks.length;
        }
        
        await this.loadTrack(nextIndex, true);
    }
    
    /**
     * Play the previous track
     */
    async playPrevious() {
        const activeTracks = this.getActiveTracks();
        
        if (activeTracks.length === 0) return;
        
        // If current time is more than 3 seconds, restart the current track
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        
        let prevIndex;
        
        if (this.isShuffleOn) {
            // Get previous track from shuffle queue
            const currentShuffleIndex = this.shuffledIndices.indexOf(this.currentTrackIndex);
            
            if (currentShuffleIndex > 0) {
                // If we have previous tracks in the shuffle queue, get the previous one
                prevIndex = this.shuffledIndices[currentShuffleIndex - 1];
            } else {
                // If we're at the beginning of shuffle queue, go to the last track
                prevIndex = this.shuffledIndices[this.shuffledIndices.length - 1];
            }
        } else {
            // Normal sequential playback
            prevIndex = (this.currentTrackIndex - 1 + activeTracks.length) % activeTracks.length;
        }
        
        await this.loadTrack(prevIndex, true);
    }
    
    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        this.isShuffleOn = !this.isShuffleOn;
        
        if (this.isShuffleOn) {
            // Turn off repeat if shuffle is being turned on
            if (this.isRepeatOn) {
                this.isRepeatOn = false;
                this.triggerEvent('repeatChanged', { isRepeatOn: false });
            }
            
            // Generate a completely fresh shuffle queue
            this.generateShuffleQueue();
        }
        
        localStorage.setItem('isShuffleOn', this.isShuffleOn);
        localStorage.setItem('isRepeatOn', this.isRepeatOn);
        
        // Notify subscribers
        this.triggerEvent('shuffleChanged', { isShuffleOn: this.isShuffleOn });
        
        return this.isShuffleOn;
    }
    
    /**
     * Generate a shuffled queue of track indices
     */
    generateShuffleQueue() {
        const activeTracks = this.getActiveTracks();
        
        // Create array of all track indices
        const indices = Array.from({ length: activeTracks.length }, (_, i) => i);
        
        // Fisher-Yates shuffle algorithm to randomly order all tracks
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // If we have a current track, make sure it's first so we don't interrupt playback
        if (this.currentTrackIndex !== undefined && this.currentTrackIndex >= 0) {
            const currentIdx = indices.indexOf(this.currentTrackIndex);
            if (currentIdx !== -1) {
                indices.splice(currentIdx, 1);
                indices.unshift(this.currentTrackIndex);
            }
        }
        
        this.shuffledIndices = indices;
        localStorage.setItem('shuffledIndices', JSON.stringify(indices));
        
        console.log('Generated shuffle queue with ' + indices.length + ' tracks');
    }
    
    /**
     * Toggle repeat mode
     */
    toggleRepeat() {
        this.isRepeatOn = !this.isRepeatOn;
        
        // Turn off shuffle if repeat is being turned on
        if (this.isRepeatOn && this.isShuffleOn) {
            this.isShuffleOn = false;
            this.triggerEvent('shuffleChanged', { isShuffleOn: false });
        }
        
        localStorage.setItem('isRepeatOn', this.isRepeatOn);
        localStorage.setItem('isShuffleOn', this.isShuffleOn);
        
        // Notify subscribers
        this.triggerEvent('repeatChanged', { isRepeatOn: this.isRepeatOn });
        
        return this.isRepeatOn;
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
        return this.audio ? this.audio.currentTime : 0;
    }
    
    /**
     * Get total duration of the track
     */
    getDuration() {
        return this.audio && !isNaN(this.audio.duration) ? this.audio.duration : 0;
    }
    
    /**
     * Check if the current track is liked
     */
    async isTrackLiked() {
        if (!this.currentTrack || !this.currentTrack.id) {
            return false;
        }
        
        try {
            const response = await fetch(`${config.API_URL}/tracks/${this.currentTrack.id}/like`);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            return data.liked;
        } catch (error) {
            console.error('Error checking if track is liked:', error);
            return false;
        }
    }
    
    /**
     * Toggle like status for current track
     */
    async toggleLike() {
        if (!this.currentTrack || !this.currentTrack.id) {
            return false;
        }
        
        try {
            const response = await fetch(`${config.API_URL}/tracks/${this.currentTrack.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Notify subscribers of the change
            this.triggerEvent('likeChanged', { 
                track: this.currentTrack, 
                liked: data.liked 
            });
            
            return data.liked;
        } catch (error) {
            console.error('Error toggling like status:', error);
            return false;
        }
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