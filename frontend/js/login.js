document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    // Handle regular login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        try {
            console.log('Starting login attempt...');
            console.log('API URL:', `${config.API_URL}/auth/login`);
            
            const requestData = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrUsername: email, password })
            };
            
            console.log('Sending request with data:', { email, password: '***' });
            
            const response = await fetch(`${config.API_URL}/auth/login`, requestData);
            console.log('Raw response:', response);
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error response:', errorData);
                try {
                    const errorJson = JSON.parse(errorData);
                    alert(errorJson.message || 'Login failed. Please check your credentials.');
                } catch (e) {
                    alert('Login failed. Please try again.');
                }
                return;
            }
            
            const data = await response.json();
            console.log('Login successful, received data:', { ...data, token: '***' });
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('Redirecting to index.html...');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            alert('An error occurred during login. Please check your network connection and try again.');
        }
    });
    
    // Handle Google login
    googleLoginBtn.addEventListener('click', () => {
        console.log('Google login clicked, redirecting to:', `${config.API_URL}/auth/google`);
        
        // Store the current timestamp to detect login failures
        localStorage.setItem('googleAuthStarted', Date.now().toString());
        
        // Add loading state to button
        googleLoginBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Connecting to Google...';
        googleLoginBtn.disabled = true;
        
        // Start redirect to Google OAuth
        window.location.href = `${config.API_URL}/auth/google`;
    });
    
    // Check for failed Google authentication on page load
    const googleAuthStarted = localStorage.getItem('googleAuthStarted');
    if (googleAuthStarted) {
        const startTime = parseInt(googleAuthStarted);
        const currentTime = Date.now();
        
        // If more than 5 seconds have passed since auth started and we're back at login page,
        // it likely failed
        if (currentTime - startTime > 5000) {
            // Show a failed auth message
            console.warn('Detected possible failed Google auth attempt');
            localStorage.removeItem('googleAuthStarted');
        }
    }
});
