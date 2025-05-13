(async () => {
    // Initialize the music player
    window.player = new MusicPlayer();
    
    try {
        // Load tracks from API
        const tracks = await window.player.loadTracks();
        const tracksContainer = document.getElementById('tracks-container');
        
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
        
        // Store row references for later updates
        const trackRows = [];
        
        // Clear any existing content
        tracksContainer.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const row = document.createElement('tr');
            const duration = track.duration > 0 ? window.player.formatTime(track.duration) : '-:--';
            
            row.innerHTML = `
                <td class="track-number">${index + 1}</td>
                <td class="song-info">
                    <img src="${track.cover_url}" alt="${track.title}">
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    <div>
                        <span class="song-title ${index === window.player.currentTrackIndex ? 'active-song' : ''}">${track.title}</span>
                        <span class="song-artist">${track.artist}</span>
                    </div>
                </td>
                <td>${track.album || track.title}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td class="track-duration">${duration}</td>
            `;
            
            row.addEventListener('click', async () => {
                if (window.player.currentTrackIndex === index && window.player.isPlaying) {
                    await window.player.togglePlayPause();
                } else {
                    await window.player.loadTrack(index, true);
                }
            });
            
            tracksContainer.appendChild(row);
            trackRows[index] = row;
        });

        // Connect playback controls
        const playPauseBtn = document.querySelector('.play-pause');
        const prevBtn = document.querySelector('.previous');
        const nextBtn = document.querySelector('.next');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => window.player.togglePlayPause());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => window.player.playPrevious());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => window.player.playNext());
        }

        // Listen for audio loaded events to update durations
        window.player.audio.addEventListener('loadedmetadata', () => {
            const currentTrack = window.player.tracks[window.player.currentTrackIndex];
            if (currentTrack && trackRows[window.player.currentTrackIndex]) {
                const durationCell = trackRows[window.player.currentTrackIndex].querySelector('.track-duration');
                if (durationCell && window.player.audio.duration) {
                    durationCell.textContent = window.player.formatTime(window.player.audio.duration);
                }
            }
        });

        window.player.audio.addEventListener('play', () => {
            window.player.updateActiveSong(window.player.currentTrackIndex);
            // Update play button to pause icon
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        });
        
        window.player.audio.addEventListener('pause', () => {
            // Update pause button to play icon
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });

        window.player.audio.addEventListener('ended', () => {
            const nextIndex = (window.player.currentTrackIndex + 1) % window.player.tracks.length;
            window.player.handleTrackChange(nextIndex);
        });

    } catch (error) {
        console.error('Error in liked-songs.js:', error);
        // Show error message
        document.getElementById('tracks-container').innerHTML = `
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
})();
