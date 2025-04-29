// Common functionality for authentication and user state
const auth = {
    isAuthenticated() {
        return localStorage.getItem('isAuthenticated') === 'true';
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    updateUserUI() {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (isAuthenticated && user) {
            // Get display name from user data
            let displayName = user.name;
            
            // If name is not available, try to get it from email
            if (!displayName && user.email) {
                displayName = user.email.split('@')[0];
                // Capitalize first letter
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            }
            
            // If still no display name, use username
            if (!displayName && user.username) {
                displayName = user.username;
            }
            
            // If still no display name, use a default
            if (!displayName) {
                displayName = 'User';
            }
            
            document.querySelector('.navbar-right').innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-button">
                        <span>${displayName}</span>
                        <i class="fas fa-caret-down"></i>
                    </button>
                    <div class="user-dropdown">
                        <a href="userprofile.html">Profile</a>
                        <a href="#" id="logout-btn">Log Out</a>
                    </div>
                </div>
            `;
            
            // Add logout functionality
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        } else {
            document.querySelector('.navbar-right').innerHTML = `
                <a href="login.html" class="login-btn">Log In</a>
            `;
        }
    }
};

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = auth.getToken();
    
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    try {
        const response = await fetch(`${config.API_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            auth.logout();
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API request error:', error);
        return null;
    }
}

// Initialize page
function initializePage() {
    // Update authentication UI
    auth.updateUserUI();
    
    // Add active class to current navigation item
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navigation a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.parentElement.classList.add('active');
        }
    });

    // Page transition animation
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
}

// Protected route check
function checkAuth() {
    const publicPages = ['login.html', 'signup.html', 'index.html', 'auth-success.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!publicPages.includes(currentPage) && !auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        initializePage();
    }
}); 