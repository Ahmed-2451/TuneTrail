(async () => {
    try {
        // Make sure player instance exists
        if (!window.player) {
            window.player = new MusicPlayer();
        }
        
        // Get player service instance
        const playerService = window.playerService;
        
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
            // Format duration using the formatTime from MusicPlayer
            const duration = track.duration > 0 ? window.player.formatTime(track.duration) : '-:--';
            
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
                // Play/pause or load a different track
                if (playerService.currentTrackIndex === index && playerService.isPlaying) {
                    await playerService.togglePlayPause();
                } else {
                    await playerService.loadTrack(index, true);
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
