class MusicPlayer {
    constructor() {
        console.log('MusicPlayer constructor called');
        
        // Use the shared PlayerService instead of creating a new Audio instance
        this.playerService = window.playerService;
        this.audio = this.playerService.audio;
        this.tracks = [];
        
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
    }

    addEventListeners() {
        // Player controls
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.playNext());
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.playPrevious());
        }
        
        // Volume controls
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('click', (e) => this.handleVolumeChange(e));
        }
        if (this.volumeBtn) {
            this.volumeBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // Progress bar
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));
        }
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
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
        if (this.songTitle) this.songTitle.textContent = track.title || '';
        if (this.songArtist) this.songArtist.textContent = track.artist || '';
        if (this.songImage) this.songImage.src = track.cover_url || '';
    }

    async togglePlayPause() {
        await this.playerService.togglePlayPause();
    }

    updatePlayButton(isPlaying) {
        if (this.playPauseBtn) {
            this.playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
    }

    async playNext() {
        await this.playerService.playNext();
    }

    async playPrevious() {
        await this.playerService.playPrevious();
    }

    handleVolumeChange(e) {
        const rect = this.volumeSlider.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.setVolume(position);
    }

    setVolume(volume) {
        this.playerService.setVolume(volume);
        this.updateVolumeDisplay(volume);
    }

    updateVolumeDisplay(volume) {
        if (this.volumeProgress) {
            this.volumeProgress.style.width = `${volume * 100}%`;
        }
        this.updateVolumeIcon(volume);
    }

    toggleMute() {
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
        const rect = this.progressBar.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = position * this.audio.duration;
    }

    updateProgress() {
        if (!this.audio.duration) return;
        
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