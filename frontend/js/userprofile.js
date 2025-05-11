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
            
            // Update profile name
            const profileName = document.getElementById('profile-name');
            if (profileName) {
                if (user.name) profileName.textContent = user.name;
                else if (user.username) profileName.textContent = user.username;
                else if (user.email) profileName.textContent = user.email.split('@')[0];
                else profileName.textContent = 'User';
            }
            
            // Update username
            const profileUsername = document.getElementById('profile-username');
            if (profileUsername) {
                if (user.username) profileUsername.textContent = `@${user.username}`;
                else profileUsername.textContent = '';
            }
            
            // Update email
            const profileEmail = document.getElementById('profile-email');
            if (profileEmail) {
                if (user.email) profileEmail.textContent = user.email;
                else profileEmail.textContent = '';
            }
            
            // Update playlist stats
            const statItems = document.querySelectorAll('.stat-item span');
            if (statItems.length > 0) {
                if (user.playlists && Array.isArray(user.playlists)) {
                    statItems[0].textContent = user.playlists.length;
                } else {
                    statItems[0].textContent = '0';
                }
            }
            
            // Update playlist cards' owner name if user data is available
            const playlistCards = document.querySelectorAll('.playlist-card');
            playlistCards.forEach((card) => {
                const owner = card.querySelector('p');
                if (owner && user.name) {
                    owner.textContent = `By ${user.name}`;
                } else if (owner && user.username) {
                    owner.textContent = `By ${user.username}`;
                }
            });
            
            // Handle any profile-specific interactions here
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
