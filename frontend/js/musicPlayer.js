class MusicPlayer {
    constructor() {
        console.log('MusicPlayer constructor called');
        
        // Check if we're already initialized by checking DOM state
        if (document.querySelector('.player.initialized')) {
            console.log('Player UI already initialized, skipping redundant setup');
            this.addEventListenersOnly();
            return;
        }
        
        // Use the shared PlayerService instead of creating a new Audio instance
        this.playerService = window.playerService;
        this.audio = this.playerService.audio;
        this.tracks = [];
        
        // Mark the player as initialized
        const playerElement = document.querySelector('.player');
        if (playerElement) {
            playerElement.classList.add('initialized');
        }
        
        this.initializeElements();
        this.addEventListeners();
        
        // Subscribe to player service events
        this.playerService.subscribe('trackChanged', this.handleTrackChanged.bind(this));
        this.playerService.subscribe('playbackStateChanged', this.handlePlaybackStateChanged.bind(this));
        this.playerService.subscribe('volumeChanged', this.handleVolumeChanged.bind(this));
        
        // Load tracks and reflect current state in UI
        this.loadTracks().then(() => {
            console.log(`Loaded ${this.tracks.length} tracks`);
            
            // Update the UI based on current player state
            if (this.tracks.length > 0) {
                const currentIndex = this.playerService.currentTrackIndex;
                if (currentIndex >= 0 && currentIndex < this.tracks.length) {
                    const currentTrack = this.tracks[currentIndex];
                    this.updateTrackInfo(currentTrack);
                    this.updatePlayButton(this.playerService.isPlaying);
                    this.updateActiveSong(currentIndex);
                }
            }
        }).catch(error => {
            console.error('Error in loadTracks promise:', error);
        });
    }
    
    // Only add event listeners if we're already initialized
    addEventListenersOnly() {
        this.playerService = window.playerService;
        this.audio = this.playerService.audio;
        this.initializeElements();
        this.addEventListeners();
        
        // Subscribe to player service events
        this.playerService.subscribe('trackChanged', this.handleTrackChanged.bind(this));
        this.playerService.subscribe('playbackStateChanged', this.handlePlaybackStateChanged.bind(this));
        this.playerService.subscribe('volumeChanged', this.handleVolumeChanged.bind(this));
        
        // Update UI with current state
        if (this.playerService.currentTrack) {
            this.updateTrackInfo(this.playerService.currentTrack);
            this.updatePlayButton(this.playerService.isPlaying);
        }
    }

    initializeElements() {
        this.playPauseBtn = document.querySelector('.play-pause');
        this.nextBtn = document.querySelector('.next');
        this.prevBtn = document.querySelector('.previous');
        this.volumeBtn = document.querySelector('.volume-button');
        this.volumeSlider = document.querySelector('.volume-slider');
        this.volumeProgress = document.querySelector('.volume-progress');
        this.progressBar = document.querySelector('.progress-bar');
        this.progress = document.querySelector('.progress');
        this.currentTimeSpan = document.querySelector('.current-time');
        this.totalTimeSpan = document.querySelector('.total-time');
        this.songTitle = document.querySelector('.song-details h4');
        this.songArtist = document.querySelector('.song-details p');
        this.songImage = document.querySelector('.current-song-image');
        
        // If we already have volume info, update the UI
        if (this.playerService && this.volumeProgress) {
            this.updateVolumeDisplay(this.playerService.audio.volume);
        }
    }

    addEventListeners() {
        // Player controls
        if (this.playPauseBtn) {
            // Remove any existing listeners to prevent duplicates
            const newBtn = this.playPauseBtn.cloneNode(true);
            if (this.playPauseBtn.parentNode) {
                this.playPauseBtn.parentNode.replaceChild(newBtn, this.playPauseBtn);
            }
            this.playPauseBtn = newBtn;
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (this.nextBtn) {
            const newBtn = this.nextBtn.cloneNode(true);
            if (this.nextBtn.parentNode) {
                this.nextBtn.parentNode.replaceChild(newBtn, this.nextBtn);
            }
            this.nextBtn = newBtn;
            this.nextBtn.addEventListener('click', () => this.playNext());
        }
        
        if (this.prevBtn) {
            const newBtn = this.prevBtn.cloneNode(true);
            if (this.prevBtn.parentNode) {
                this.prevBtn.parentNode.replaceChild(newBtn, this.prevBtn);
            }
            this.prevBtn = newBtn;
            this.prevBtn.addEventListener('click', () => this.playPrevious());
        }
        
        // Volume controls
        if (this.volumeSlider) {
            const newSlider = this.volumeSlider.cloneNode(true);
            if (this.volumeSlider.parentNode) {
                this.volumeSlider.parentNode.replaceChild(newSlider, this.volumeSlider);
            }
            this.volumeSlider = newSlider;
            this.volumeProgress = this.volumeSlider.querySelector('.volume-progress');
            this.volumeSlider.addEventListener('click', (e) => this.handleVolumeChange(e));
        }
        
        if (this.volumeBtn) {
            const newBtn = this.volumeBtn.cloneNode(true);
            if (this.volumeBtn.parentNode) {
                this.volumeBtn.parentNode.replaceChild(newBtn, this.volumeBtn);
            }
            this.volumeBtn = newBtn;
            this.volumeBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // Progress bar
        if (this.progressBar) {
            const newBar = this.progressBar.cloneNode(true);
            if (this.progressBar.parentNode) {
                this.progressBar.parentNode.replaceChild(newBar, this.progressBar);
            }
            this.progressBar = newBar;
            this.progress = this.progressBar.querySelector('.progress');
            this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));
        }
        
        // Audio events - use one-time binding to avoid duplicate events
        if (this.audio) {
            // Clean up existing listeners first
            const timeUpdateHandler = () => this.updateProgress();
            this.audio._timeUpdateHandler = timeUpdateHandler;  // Store reference for future cleanup
            
            this.audio.addEventListener('timeupdate', timeUpdateHandler);
        }
    }

    async loadTracks() {
        // Use PlayerService to load tracks
        this.tracks = await this.playerService.loadTracks();
        return this.tracks;
    }

    async loadTrack(index, shouldPlay = false) {
        // Use PlayerService to load track
        await this.playerService.loadTrack(index, shouldPlay);
    }

    updateTrackInfo(track) {
        if (!track) return;
        
        if (this.songTitle) this.songTitle.textContent = track.title || '';
        if (this.songArtist) this.songArtist.textContent = track.artist || '';
        if (this.songImage && track.cover_url) this.songImage.src = track.cover_url;
    }

    async togglePlayPause() {
        await this.playerService.togglePlayPause();
    }

    updatePlayButton(isPlaying) {
        if (!this.playPauseBtn) return;
        
        this.playPauseBtn.innerHTML = isPlaying ? 
            '<i class="fas fa-pause"></i>' : 
            '<i class="fas fa-play"></i>';
    }

    async playNext() {
        await this.playerService.playNext();
    }

    async playPrevious() {
        await this.playerService.playPrevious();
    }

    handleVolumeChange(e) {
        if (!this.volumeSlider) return;
        
        const rect = this.volumeSlider.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.setVolume(position);
    }

    setVolume(volume) {
        this.playerService.setVolume(volume);
        this.updateVolumeDisplay(volume);
    }

    updateVolumeDisplay(volume) {
        if (!this.volumeProgress) return;
        
        this.volumeProgress.style.width = `${volume * 100}%`;
        this.updateVolumeIcon(volume);
    }

    toggleMute() {
        if (!this.audio) return;
        
        const currentVolume = this.audio.volume;
        if (currentVolume > 0) {
            this.previousVolume = currentVolume;
            this.setVolume(0);
        } else {
            this.setVolume(this.previousVolume || 1);
        }
    }

    updateVolumeIcon(volume) {
        if (!this.volumeBtn) return;
        
        if (volume === 0) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (volume < 0.5) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    handleProgressBarClick(e) {
        if (!this.progressBar || !this.audio || !this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = position * this.audio.duration;
    }

    updateProgress() {
        if (!this.audio || !this.audio.duration) return;
        
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        if (this.progress) {
            this.progress.style.width = `${progress}%`;
        }
        if (this.currentTimeSpan) {
            this.currentTimeSpan.textContent = this.formatTime(this.audio.currentTime);
        }
        if (this.totalTimeSpan && this.audio.duration) {
            this.totalTimeSpan.textContent = this.formatTime(this.audio.duration);
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateActiveSong(index) {
        // Remove active class from all song titles
        document.querySelectorAll('.song-title').forEach(title => {
            title.classList.remove('active-song');
        });

        // Add active class to current song
        const songTitles = document.querySelectorAll('.song-title');
        if (songTitles[index]) {
            songTitles[index].classList.add('active-song');
        }
    }

    // Event handlers for PlayerService events
    handleTrackChanged(data) {
        this.updateTrackInfo(data.track);
        this.updateActiveSong(data.index);
    }

    handlePlaybackStateChanged(data) {
        this.updatePlayButton(data.isPlaying);
    }

    handleVolumeChanged(data) {
        this.updateVolumeDisplay(data.volume);
    }
} 