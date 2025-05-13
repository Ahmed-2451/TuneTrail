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
            window.playerService = new PlayerService();
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Make sure player instance exists
        if (!window.player) {
            console.log('MusicPlayer not found, creating it now');
            window.player = new MusicPlayer();
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Get player service instance
        const playerService = window.playerService;
        if (!playerService) {
            throw new Error("Player service not initialized properly");
        }
        
        // Load tracks from API
        const tracks = await playerService.loadTracks();
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
        
        // Clear any existing content
        tracksContainer.innerHTML = '';
        
        // Get current track index
        const currentIndex = playerService.currentTrackIndex;
        
        tracks.forEach((track, index) => {
            const row = document.createElement('tr');
            // Format duration safely
            const formatTime = (seconds) => {
                if (!seconds || isNaN(seconds) || seconds < 0) {
                    return '0:00';
                }
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            const duration = track.duration > 0 ? formatTime(track.duration) : '-:--';
            
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
                <td>${new Date().toLocaleDateString()}</td>
                <td class="track-duration">${duration}</td>
            `;
            
            row.addEventListener('click', async () => {
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
