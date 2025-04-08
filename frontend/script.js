// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation active states
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navigation a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });

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
