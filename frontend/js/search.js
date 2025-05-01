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
                        const resultElement = document.createElement('div');
                        resultElement.className = 'search-result';
                        resultElement.innerHTML = `
                            <img src="${track.cover_url}" alt="${track.title}">
                            <div class="result-info">
                                <h3>${track.title}</h3>
                                <p>${track.artist}</p>
                            </div>
                        `;
                        
                        resultElement.addEventListener('click', async () => {
                            await window.player.loadTrack(tracks.indexOf(track));
                            window.player.togglePlayPause();
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
