// Common functionality for all pages
document.addEventListener('DOMContentLoaded', () => {
    // Handle active navigation states
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navigation a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.parentElement.classList.add('active');
        }
    });

    // Handle smooth transitions between pages
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const currentContent = document.querySelector('.main-container');
            
            // Add fade-out effect
            currentContent.style.opacity = '0';
            currentContent.style.transform = 'translateY(20px)';
            
            // Navigate after transition
            setTimeout(() => {
                window.location.href = link.href;
            }, 300);
        }
    });

    // Add entrance animation
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.opacity = '0';
        mainContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            mainContainer.style.transition = 'all 0.3s ease';
            mainContainer.style.opacity = '1';
            mainContainer.style.transform = 'translateY(0)';
        }, 100);
    }

    // Handle playlist card clicks
    const playlistCards = document.querySelectorAll('.playlist-card');
    playlistCards.forEach(card => {
        card.addEventListener('click', () => {
            // Navigate to playlist detail page (when implemented)
            window.location.href = 'playlists.html';
        });
    });

    // Handle create playlist button
    const createPlaylistBtn = document.querySelector('.create-playlist-btn');
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', () => {
            window.location.href = 'playlists.html';
        });
    }

    // Handle like button clicks
    const likeButtons = document.querySelectorAll('.like-button');
    likeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = button.querySelector('i');
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#1db954';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '#b3b3b3';
            }
        });
    });

    // Handle find songs button in liked songs page
    const findSongsBtn = document.querySelector('.find-songs-btn');
    if (findSongsBtn) {
        findSongsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'search.html';
        });
    }

    // Handle authentication state
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const authButtons = document.querySelector('.navbar');
    
    if (isAuthenticated) {
        authButtons.innerHTML = `
            <ul>
                <li>
                    <a href="#">Premium</a>
                </li>
                <li>
                    <a href="#">Download</a>
                </li>
                <li class="divider">|</li>
                <li>
                    <a href="#" id="profile-link">
                        <i class="fas fa-user"></i>
                        Profile
                    </a>
                </li>
            </ul>
            <button type="button" onclick="handleLogout()">Log Out</button>
        `;
    }

    // Handle search functionality
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchQuery = document.querySelector('.search-input').value;
            // Implement search functionality here
            console.log('Searching for:', searchQuery);
        });
    }
});

// Handle logout
function handleLogout() {
    localStorage.removeItem('isAuthenticated');
    window.location.href = 'login.html';
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Here you would typically make an API call to authenticate
    // For now, we'll just simulate a successful login
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'index.html';
}

// Handle signup form submission
function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Here you would typically make an API call to register
    // For now, we'll just simulate a successful signup
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'index.html';
}
