(async () => {
    window.player = new MusicPlayer();
    
    try {
        const tracks = await window.player.loadTracks();
        const tracksContainer = document.getElementById('tracks-container');
        
        // Store row references for later updates
        const trackRows = [];
        
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
        });

        window.player.audio.addEventListener('ended', () => {
            const nextIndex = (window.player.currentTrackIndex + 1) % window.player.tracks.length;
            window.player.handleTrackChange(nextIndex);
        });

    } catch (error) {
        console.error('Error loading tracks:', error);
    }
})();
