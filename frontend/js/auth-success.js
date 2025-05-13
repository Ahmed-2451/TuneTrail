document.addEventListener('DOMContentLoaded', () => {
    // Get token and user info from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    console.log('Auth success page loaded, checking for token...');
    
    if (token) {
        console.log('Token found, storing authentication data');
        // Store token in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Store user information if available
        if (userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('user', JSON.stringify(user));
                console.log('User information saved:', user);
                
                // Show success message with username
                document.getElementById('auth-success-message').textContent = 
                    `Welcome, ${user.name || user.username}! You have successfully logged in.`;
            } catch (error) {
                console.error('Error parsing user information:', error);
                document.getElementById('auth-success-message').textContent = 
                    'Authentication successful! User details could not be parsed.';
            }
        } else {
            console.warn('No user information found in URL');
            document.getElementById('auth-success-message').textContent = 
                'Authentication successful! No user details were provided.';
        }
        
        // Hide loading indicator after successful auth
        document.getElementById('loading-indicator').style.display = 'none';
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } else {
        console.error('No token found in URL');
        // If no token, show error and provide button to login page
        document.getElementById('auth-success-title').innerHTML = '<i class="fas fa-exclamation-circle"></i> Authentication Failed';
        document.getElementById('auth-success-title').style.color = '#ff5252';
        document.getElementById('auth-success-message').textContent = 'No authentication token was found. Please try logging in again.';
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('redirect-btn').textContent = 'Back to Login';
        document.getElementById('redirect-btn').addEventListener('click', () => {
            window.location.href = 'login.html';
        });
        return;
    }
    
    // Manual redirect button
    document.getElementById('redirect-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
