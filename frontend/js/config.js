const config = {
    // Use relative path or dynamic URL based on environment
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api'
        : '/api'
}; 