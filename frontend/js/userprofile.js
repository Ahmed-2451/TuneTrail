// Initialize the music player on the user profile page
document.addEventListener('DOMContentLoaded', async function() {
    // Create a music player instance
    try {
        if (!window.player) {
            console.log('Initializing music player on userprofile page');
            window.player = new MusicPlayer();
        }
        
        // Initialize profile-specific functionality
        initializeProfileFunctions();
    } catch (error) {
        console.error('Error initializing player:', error);
    }
    
    function initializeProfileFunctions() {
        try {
            // Get user data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            // Update playlist stats if needed
            const statItems = document.querySelectorAll('.stat-item span');
            if (statItems.length > 0 && user.playlists) {
                statItems[0].textContent = user.playlists.length || '12';
            }
            
            // Handle any profile-specific interactions here
            const playlistCards = document.querySelectorAll('.playlist-card');
            playlistCards.forEach((card, index) => {
                card.addEventListener('click', () => {
                    // If we have tracks, play the corresponding one
                    if (window.player && window.player.tracks && window.player.tracks.length > index) {
                        window.player.loadTrack(index, true);
                    } else {
                        // Otherwise go to playlists page
                        window.location.href = 'playlists.html';
                    }
                });
            });
        } catch (error) {
            console.error('Error in profile functions:', error);
        }
    }
});
