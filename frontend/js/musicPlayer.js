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
                    
                    // Initialize like button
                    this.initializeLikeButton();
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
        
        // Shuffle and Repeat buttons
        this.shuffleButton = document.querySelector('.shuffle');
        if (this.shuffleButton) {
            const newBtn = this.shuffleButton.cloneNode(true);
            if (this.shuffleButton.parentNode) {
                this.shuffleButton.parentNode.replaceChild(newBtn, this.shuffleButton);
            }
            this.shuffleButton = newBtn;
            this.shuffleButton.addEventListener('click', () => this.toggleShuffle());
            // Initialize state if available
            if (this.playerService && this.playerService.isShuffle) {
                this.updateShuffleButton(true);
            }
        }
        
        this.repeatButton = document.querySelector('.repeat');
        if (this.repeatButton) {
            const newBtn = this.repeatButton.cloneNode(true);
            if (this.repeatButton.parentNode) {
                this.repeatButton.parentNode.replaceChild(newBtn, this.repeatButton);
            }
            this.repeatButton = newBtn;
            this.repeatButton.addEventListener('click', () => this.toggleRepeat());
            // Initialize state if available
            if (this.playerService && this.playerService.isRepeat) {
                this.updateRepeatButton(true);
            }
        }
        
        // Volume controls with drag functionality
        if (this.volumeSlider) {
            const newSlider = this.volumeSlider.cloneNode(true);
            if (this.volumeSlider.parentNode) {
                this.volumeSlider.parentNode.replaceChild(newSlider, this.volumeSlider);
            }
            this.volumeSlider = newSlider;
            this.volumeProgress = this.volumeSlider.querySelector('.volume-progress');
            this.volumeHandle = this.volumeSlider.querySelector('.volume-handle');
            
            // Click for immediate volume change
            this.volumeSlider.addEventListener('click', (e) => this.handleVolumeChange(e));
            
            // Mouse drag for volume
            this.volumeSlider.addEventListener('mousedown', (e) => {
                // Prevent default to avoid text selection
                e.preventDefault();
                
                // Set flag that we're dragging volume
                this.isDraggingVolume = true;
                this.volumeSlider.classList.add('dragging');
                
                // Handle the initial position
                this.handleVolumeChange(e);
                
                // Set up temporary event listeners for drag
                document.addEventListener('mousemove', this.handleVolumeDrag = (e) => this.handleVolumeDrag(e));
                document.addEventListener('mouseup', this.handleVolumeDragEnd = (e) => {
                    this.handleVolumeDragEnd(e);
                    
                    // Add a small delay before removing the hover effect
                    setTimeout(() => {
                        if (!this.isHoveringVolume) {
                            this.volumeSlider.classList.remove('hover');
                        }
                    }, 50);
                });
            });
            
            // Add mouse enter/leave events for hover state
            this.volumeSlider.addEventListener('mouseenter', () => {
                this.isHoveringVolume = true;
                this.volumeSlider.classList.add('hover');
            });
            
            this.volumeSlider.addEventListener('mouseleave', () => {
                this.isHoveringVolume = false;
                // Only remove hover if not dragging
                if (!this.isDraggingVolume) {
                    this.volumeSlider.classList.remove('hover');
                }
            });
            
        }
        
        if (this.volumeBtn) {
            const newBtn = this.volumeBtn.cloneNode(true);
            if (this.volumeBtn.parentNode) {
                this.volumeBtn.parentNode.replaceChild(newBtn, this.volumeBtn);
            }
            this.volumeBtn = newBtn;
            this.volumeBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // Progress bar with enhanced drag functionality
        if (this.progressBar) {
            const newBar = this.progressBar.cloneNode(true);
            if (this.progressBar.parentNode) {
                this.progressBar.parentNode.replaceChild(newBar, this.progressBar);
            }
            this.progressBar = newBar;
            this.progress = this.progressBar.querySelector('.progress');
            this.progressHandle = this.progressBar.querySelector('.progress-handle');
            
            // Click listener (for direct clicks)
            this.progressBar.addEventListener('click', (e) => this.handleProgressBarClick(e));
            
            // Mouse events for desktop
            this.progressBar.addEventListener('mousedown', (e) => {
                // Prevent default to avoid text selection
                e.preventDefault();
                
                // Add active class to show we're dragging
                this.progressBar.classList.add('dragging');
                this.isDraggingProgress = true;
                
                // Update immediately for responsiveness
                this.handleProgressBarClick(e);
                
                // Add temp listeners for drag tracking
                document.addEventListener('mousemove', this.handleProgressDrag = (e) => this.handleProgressDrag(e));
                document.addEventListener('mouseup', this.handleProgressDragEnd = (e) => {
                    this.handleProgressDragEnd(e);
                    
                    // Add a small delay before removing the hover effect
                    // This ensures the hover class is removed after the mouseup event
                    setTimeout(() => {
                        if (!this.isHoveringProgress) {
                            this.progressBar.classList.remove('hover');
                        }
                    }, 50);
                });
            });
            
            // Add mouse enter/leave events to handle hover state
            this.progressBar.addEventListener('mouseenter', () => {
                this.isHoveringProgress = true;
                this.progressBar.classList.add('hover');
            });
            
            this.progressBar.addEventListener('mouseleave', () => {
                this.isHoveringProgress = false;
                // Only remove hover if not dragging
                if (!this.isDraggingProgress) {
                    this.progressBar.classList.remove('hover');
                }
            });
            
            // Touch events for mobile
            this.progressBar.addEventListener('touchstart', (e) => {
                e.preventDefault();
                
                this.progressBar.classList.add('dragging');
                this.isDraggingProgress = true;
                
                const touch = e.touches[0];
                this.handleProgressTouch(touch);
                
                document.addEventListener('touchmove', this.handleProgressTouchMove = (e) => this.handleProgressTouchMove(e));
                document.addEventListener('touchend', this.handleProgressTouchEnd = () => {
                    this.handleProgressTouchEnd();
                    this.progressBar.classList.remove('hover');
                });
            });
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
        const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.audio.currentTime = position * this.audio.duration;
        
        // Update UI immediately for responsive feel
        this.updateProgressUI(position);
    }

    updateProgressUI(position) {
        if (!this.progress) return;
        
        // Calculate the percentage (0-100)
        const percentage = position * 100;
        this.progress.style.width = `${percentage}%`;
        
        if (this.currentTimeSpan && this.audio) {
            // Calculate the time in seconds
            const timeInSeconds = position * this.audio.duration;
            this.currentTimeSpan.textContent = this.formatTime(timeInSeconds);
        }
    }

    updateProgress() {
        if (!this.audio || !this.audio.duration) return;
        
        const progress = (this.audio.currentTime / this.audio.duration);
        this.updateProgressUI(progress);
        
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
        
        // Initialize like button for the new track
        this.initializeLikeButton();
    }

    handlePlaybackStateChanged(data) {
        this.updatePlayButton(data.isPlaying);
    }

    handleVolumeChanged(data) {
        this.updateVolumeDisplay(data.volume);
    }

    // Drag handler for progress bar
    handleProgressDrag(e) {
        if (!this.isDraggingProgress) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        // Just update the UI while dragging (don't set audio.currentTime yet)
        // This makes for smooth dragging without audio glitching
        this.updateProgressUI(position);
    }

    handleProgressDragEnd(e) {
        if (!this.isDraggingProgress) return;
        
        this.progressBar.classList.remove('dragging');
        this.isDraggingProgress = false;
        
        // Now set the actual audio time based on the final position
        if (!this.audio || !this.audio.duration) return;
        
        // Get position from event
        if (this.progressBar && e) {
            const rect = this.progressBar.getBoundingClientRect();
            const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.audio.currentTime = position * this.audio.duration;
        } else {
            // Fallback to use width percentage
            const computedStyle = window.getComputedStyle(this.progress);
            const widthStr = computedStyle.getPropertyValue('width');
            const width = parseFloat(widthStr) / parseFloat(computedStyle.getPropertyValue('width', this.progressBar));
            this.audio.currentTime = this.audio.duration * width;
        }
        
        // Remove temp listeners
        document.removeEventListener('mousemove', this.handleProgressDrag);
        document.removeEventListener('mouseup', this.handleProgressDragEnd);
    }

    // Touch handlers for progress bar
    handleProgressTouch(touch) {
        if (!this.progressBar || !this.audio || !this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        
        // Update UI immediately for responsive feel
        this.updateProgressUI(position);
    }

    handleProgressTouchMove(e) {
        if (!this.isDraggingProgress) return;
        
        // Prevent default to avoid scrolling while dragging
        e.preventDefault();
        
        // Get touch position
        const touch = e.touches[0];
        
        // Calculate new position
        const rect = this.progressBar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        
        // Update UI without changing audio time yet (for smoothness)
        this.updateProgressUI(position);
    }

    handleProgressTouchEnd() {
        if (!this.isDraggingProgress) return;
        
        this.progressBar.classList.remove('dragging');
        this.isDraggingProgress = false;
        
        // Now set the actual audio time based on the final position
        if (!this.audio || !this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.progress);
        const widthStr = computedStyle.getPropertyValue('width');
        const width = parseFloat(widthStr) / parseFloat(computedStyle.getPropertyValue('width', this.progressBar));
        
        this.audio.currentTime = this.audio.duration * width;
        
        // Remove temp listeners
        document.removeEventListener('touchmove', this.handleProgressTouchMove);
        document.removeEventListener('touchend', this.handleProgressTouchEnd);
    }

    // Volume drag handlers
    handleVolumeDrag(e) {
        if (!this.isDraggingVolume) return;
        
        // Calculate position and set volume
        const rect = this.volumeSlider.getBoundingClientRect();
        const volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.setVolume(volume);
    }

    handleVolumeDragEnd(e) {
        if (!this.isDraggingVolume) return;
        
        this.volumeSlider.classList.remove('dragging');
        this.isDraggingVolume = false;
        
        // Final volume calculation based on cursor position
        if (this.volumeSlider && e) {
            const rect = this.volumeSlider.getBoundingClientRect();
            const volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.setVolume(volume);
        }
        
        // Remove global listeners
        document.removeEventListener('mousemove', this.handleVolumeDrag);
        document.removeEventListener('mouseup', this.handleVolumeDragEnd);
    }

    handleVolumeTouch(touch) {
        if (!this.volumeSlider) return;
        
        const rect = this.volumeSlider.getBoundingClientRect();
        const volume = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        
        this.setVolume(volume);
    }

    handleVolumeTouchMove(e) {
        if (!this.isDraggingVolume) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = this.volumeSlider.getBoundingClientRect();
        const volume = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        
        this.setVolume(volume);
    }

    handleVolumeTouchEnd() {
        if (!this.isDraggingVolume) return;
        
        this.volumeSlider.classList.remove('dragging');
        this.isDraggingVolume = false;
        
        // Remove global listeners
        document.removeEventListener('touchmove', this.handleVolumeTouchMove);
        document.removeEventListener('touchend', this.handleVolumeTouchEnd);
    }

    // Shuffle functionality
    toggleShuffle() {
        if (!this.playerService) return;
        
        const isShuffleOn = this.playerService.toggleShuffle();
        this.updateShuffleButton(isShuffleOn);
        
        // If shuffle is turned on, repeat must be off, so update repeat button
        if (isShuffleOn) {
            this.updateRepeatButton(false);
        }
    }

    updateShuffleButton(isShuffleOn) {
        if (!this.shuffleButton) return;
        
        if (isShuffleOn) {
            this.shuffleButton.classList.add('active');
        } else {
            this.shuffleButton.classList.remove('active');
        }
    }

    // Repeat functionality
    toggleRepeat() {
        if (!this.playerService) return;
        
        const isRepeatOn = this.playerService.toggleRepeat();
        this.updateRepeatButton(isRepeatOn);
        
        // If repeat is turned on, shuffle must be off, so update shuffle button
        if (isRepeatOn) {
            this.updateShuffleButton(false);
        }
    }

    updateRepeatButton(isRepeatOn) {
        if (!this.repeatButton) return;
        
        if (isRepeatOn) {
            this.repeatButton.classList.add('active');
        } else {
            this.repeatButton.classList.remove('active');
        }
    }

    // Initialize the like button for the current track
    initializeLikeButton() {
        const likeButton = document.querySelector('.like-button');
        if (!likeButton || !this.playerService || !this.playerService.currentTrack) return;
        
        const trackId = this.playerService.currentTrack.id;
        if (!trackId) return;
        
        // Check if the track is liked
        fetch(`${config.API_URL}/tracks/${trackId}/like`)
            .then(response => response.json())
            .then(data => {
                if (data.liked) {
                    likeButton.classList.add('active');
                    likeButton.innerHTML = '<i class="fas fa-heart"></i>';
                } else {
                    likeButton.classList.remove('active');
                    likeButton.innerHTML = '<i class="far fa-heart"></i>';
                }
                
                // Add click event listener
                likeButton.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`${config.API_URL}/tracks/${trackId}/like`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({})
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            
                            // Update button appearance
                            if (data.liked) {
                                likeButton.classList.add('active');
                                likeButton.innerHTML = '<i class="fas fa-heart"></i>';
                                // Add a brief animation
                                likeButton.animate([
                                    { transform: 'scale(1)' },
                                    { transform: 'scale(1.2)' },
                                    { transform: 'scale(1)' }
                                ], {
                                    duration: 300,
                                    easing: 'ease-in-out'
                                });
                            } else {
                                likeButton.classList.remove('active');
                                likeButton.innerHTML = '<i class="far fa-heart"></i>';
                            }
                        }
                    } catch (error) {
                        console.error('Error toggling like status:', error);
                    }
                });
            })
            .catch(err => console.error('Error checking like status:', err));
    }
} 