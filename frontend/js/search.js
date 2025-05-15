    document.addEventListener('DOMContentLoaded', async () => {
        window.player = new MusicPlayer();

        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');

        searchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm.length > 0) {
                try {
                    const tracks = await window.player.loadTracks();
                    
                    const filteredTracks = tracks.filter(track => 
                        track.title.toLowerCase().includes(searchTerm) ||
                        track.artist.toLowerCase().includes(searchTerm)
                    );
                    
                    searchResults.innerHTML = '';
                    
                    filteredTracks.forEach((track, index) => {
                        // Check if the track is in liked songs
                        let isLiked = false;
                        
        
                        
                        // Create the search result element
                        const resultElement = document.createElement('div');
                        resultElement.className = 'search-result';
                        resultElement.innerHTML = `
                            <img src="${track.cover_url || 'images/image.jpg'}" alt="${track.title}">
                            <div class="result-info">
                                <h3>${track.title}</h3>
                                <p>${track.artist}</p>
                            </div>
                            <button class="search-like-button" data-track-id="${track.id}">
                                <i class="far fa-heart"></i>
                            </button>
                        `;
                        
                        // Check if this track is liked
                        fetch(`${config.API_URL}/tracks/${track.id}/like`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.liked) {
                                    const likeBtn = resultElement.querySelector('.search-like-button');
                                    likeBtn.classList.add('liked');
                                    likeBtn.querySelector('i').classList.remove('far');
                                    likeBtn.querySelector('i').classList.add('fas');
                                }
                            })
                            .catch(err => console.error('Error checking like status:', err));
                        
                        // Add click handler for playing the track
                        resultElement.addEventListener('click', async (e) => {
                            // Skip if clicking on the heart button
                            if (e.target.closest('.search-like-button')) {
                                return;
                            }
                            
                            await window.player.loadTrack(tracks.indexOf(track));
                            window.player.togglePlayPause();
                        });
                        
                        // Add heart button functionality
                        const likeButton = resultElement.querySelector('.search-like-button');
                        likeButton.addEventListener('click', async (e) => {
                            e.stopPropagation(); // Prevent triggering the parent click
                            
                            try {
                                // Toggle like status
                                const response = await fetch(`${config.API_URL}/tracks/${track.id}/like`, {
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
                                        likeButton.classList.add('liked');
                                        likeButton.querySelector('i').classList.remove('far');
                                        likeButton.querySelector('i').classList.add('fas');
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
                                        likeButton.classList.remove('liked');
                                        likeButton.querySelector('i').classList.remove('fas');
                                        likeButton.querySelector('i').classList.add('far');
                                    }
                                }
                            } catch (error) {
                                console.error('Error toggling like status:', error);
                            }
                        });
                        
                        searchResults.appendChild(resultElement);
                    });
                } catch (error) {
                    console.error('Error searching tracks:', error);
                }
            } else {
                searchResults.innerHTML = '';
            }
        });
    });
