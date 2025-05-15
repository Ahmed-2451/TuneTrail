(async () => {
    try {
        // Wait for document to be fully loaded
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }
        
        // Make sure playerService exists
        if (!window.playerService) {
            console.log('PlayerService not found, creating it now');
            // Wait for scripts to load if they haven't yet
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Check again after waiting
            if (!window.playerService && typeof PlayerService !== 'undefined') {
                window.playerService = new PlayerService();
                // Give it a moment to initialize
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Make sure player instance exists
        if (!window.player) {
            console.log('MusicPlayer not found, creating it now');
            if (typeof MusicPlayer !== 'undefined') {
                window.player = new MusicPlayer();
                // Give it a moment to initialize
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Get player service instance - use directly from window to ensure it's the latest
        const playerService = window.playerService;
        if (!playerService) {
            console.error("Player service not initialized properly");
            throw new Error("Player service not available");
        }
        
        // Set playback source to liked songs
        await playerService.setPlaybackSource('liked');
        
        // If shuffle is on, regenerate the shuffle queue for liked songs
        if (playerService.isShuffleOn) {
            playerService.generateShuffleQueue();
        }
        
        // Load tracks from API
        let tracks;
        try {
            // Use liked-songs API endpoint instead
            const response = await fetch(`${config.API_URL}/liked-songs`);
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            tracks = await response.json();
        } catch (err) {
            console.error("Error loading liked songs:", err);
            // Try again once with a delay in case of timing issues
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await fetch(`${config.API_URL}/liked-songs`);
            tracks = await response.json();
        }
        
        const tracksContainer = document.getElementById('tracks-container');
        if (!tracksContainer) {
            console.error("Tracks container not found in the DOM");
            return;
        }
        
        if (!tracks || tracks.length === 0) {
            // Show message if no tracks are available
            tracksContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="no-tracks-message">
                        <div>
                            <i class="fas fa-music"></i>
                            <p>No liked songs found. Start liking some songs!</p>
                            <a href="index.html" class="find-songs-link">Explore music</a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log(`Displaying ${tracks.length} tracks in liked songs`);
        
        // Clear any existing content
        tracksContainer.innerHTML = '';
        
        // Get current track index
        const currentIndex = playerService.currentTrackIndex;
        
        // Format date for display
        const formatDate = (dateStr) => {
            const date = dateStr ? new Date(dateStr) : new Date();
            return date.toLocaleDateString();
        };
        
        // Format duration safely with better formatting
        const formatTime = (seconds) => {
            if (!seconds || isNaN(seconds) || seconds < 0) {
                return '0:00';
            }
            
            // For durations longer than an hour, show hour:min:sec format
            if (seconds >= 3600) {
                const hours = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            
            // For normal durations show min:sec
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Add custom class if current track is playing
        const isCurrentTrack = (index) => {
            return playerService.currentTrackIndex === index ? 'active-track' : '';
        };
        
        tracks.forEach((track, index) => {
            const row = document.createElement('tr');
            // Make sure we have a valid duration to display
            let duration;
            if (track.duration && track.duration > 0) {
                duration = formatTime(track.duration);
            } else {
                console.log('Track missing duration:', track.title);
                duration = '0:00'; // Default display value
            }
            
            // Format duration and update HTML
            row.innerHTML = `
                <td class="track-number">${index + 1}</td>
                <td class="song-info">
                    <img src="${track.cover_url || 'images/image.jpg'}" alt="${track.title}">
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    <div>
                        <span class="song-title ${index === currentIndex ? 'active-song' : ''}">${track.title}</span>
                        <span class="song-artist">${track.artist}</span>
                    </div>
                </td>
                <td>${track.album || track.title}</td>
                <td>${formatDate(track.date_added)}</td>
                <td class="track-duration">
                    <button class="track-like-button liked" data-track-id="${track.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <span class="duration-text">${duration}</span>
                </td>
            `;
            
            row.addEventListener('click', async (e) => {
                // Skip if clicking on the heart button
                if (e.target.closest('.track-like-button')) {
                    return;
                }
                
                try {
                    // Play/pause or load a different track
                    if (playerService.currentTrackIndex === index && playerService.isPlaying) {
                        await playerService.togglePlayPause();
                    } else {
                        await playerService.loadTrack(index, true);
                    }
                } catch (error) {
                    console.error('Error playing track:', error);
                }
            });
            
            tracksContainer.appendChild(row);
        });
        
        // Add event listeners to like buttons after all rows are added
        document.querySelectorAll('.track-like-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent row click
                
                const trackId = button.getAttribute('data-track-id');
                if (!trackId) return;
                
                try {
                    // Toggle like status
                    const response = await fetch(`${config.API_URL}/tracks/${trackId}/like`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (!data.liked) {
                            // Add animation before removing
                            button.animate([
                                { transform: 'scale(1)' },
                                { transform: 'scale(1.2)' },
                                { transform: 'scale(0.8)' }
                            ], {
                                duration: 300,
                                easing: 'ease-in-out'
                            });
                            
                            // If the track was unliked, remove it from the list
                            const row = button.closest('tr');
                            if (row) {
                                row.style.opacity = '0';
                                setTimeout(() => {
                                    row.remove();
                                    
                                    // Update track numbers
                                    document.querySelectorAll('#tracks-container tr').forEach((row, idx) => {
                                        const numCell = row.querySelector('.track-number');
                                        if (numCell) numCell.textContent = idx + 1;
                                    });
                                    
                                    // Show empty message if no tracks left
                                    if (document.querySelectorAll('#tracks-container tr').length === 0) {
                                        tracksContainer.innerHTML = `
                                            <tr>
                                                <td colspan="5" class="no-tracks-message">
                                                    <div>
                                                        <i class="fas fa-music"></i>
                                                        <p>No liked songs found. Start liking some songs!</p>
                                                        <a href="index.html" class="find-songs-link">Explore music</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }
                                }, 300);
                                
                                // Set CSS transition
                                row.style.transition = 'opacity 0.3s';
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error toggling like status:', error);
                }
            });
        });

        // Subscribe to player service events
        playerService.subscribe('trackChanged', (data) => {
            // Update active song highlighting
            document.querySelectorAll('.song-title').forEach((title, idx) => {
                if (idx === data.index) {
                    title.classList.add('active-song');
                } else {
                    title.classList.remove('active-song');
                }
            });
        });

    } catch (error) {
        console.error('Error in liked-songs.js:', error);
        // Show error message
        const tracksContainer = document.getElementById('tracks-container');
        if (tracksContainer) {
            tracksContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="error-message">
                        <div>
                            <i class="fas fa-exclamation-circle"></i>
                            <p>There was an error loading your liked songs.</p>
                            <p class="error-details">${error.message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
})();
