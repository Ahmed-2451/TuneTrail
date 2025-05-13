document.addEventListener('DOMContentLoaded', () => {
    // Get token and user info from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    if (token) {
        // Store token in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Store user information if available
        if (userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('user', JSON.stringify(user));
                console.log('User information saved:', user);
            } catch (error) {
                console.error('Error parsing user information:', error);
            }
        }
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } else {
        // If no token, redirect to login page
        window.location.href = 'login.html';
    }
    
    // Manual redirect button
    document.getElementById('redirect-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
