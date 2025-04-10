// Common functionality for all pages
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navigation a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.parentElement.classList.add('active');
        }
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const currentContent = document.querySelector('.main-container');
            
            currentContent.style.opacity = '0';
            currentContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                window.location.href = link.href;
            }, 300);
        }
    });

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

    const playlistCards = document.querySelectorAll('.playlist-card');
    playlistCards.forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = 'playlists.html';
        });
    });

    const createPlaylistBtn = document.querySelector('.create-playlist-btn');
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', () => {
            window.location.href = 'playlists.html';
        });
    }

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

    const findSongsBtn = document.querySelector('.find-songs-btn');
    if (findSongsBtn) {
        findSongsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'search.html';
        });
    }

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

    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchQuery = document.querySelector('.search-input').value;
            console.log('Searching for:', searchQuery);
        });
    }
});

function handleLogout() {
    localStorage.removeItem('isAuthenticated');
    window.location.href = 'login.html';
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
  
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'index.html';
}

function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    

    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'index.html';
}
