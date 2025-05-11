# Spotify Clone

A full-featured Spotify clone application with music playback, playlists, user accounts, and AI-powered chatbots.

## Features

- **Music Playback**: Stream and play music with full player controls
- **User Authentication**: Login, signup, and profile management
- **Responsive Design**: Works on desktop and mobile devices
- **AI Chatbots**: Music-specific and general assistant chatbots
- **Search Functionality**: Find songs, artists, and albums

## Tech Stack

### Frontend
- HTML, CSS, JavaScript
- Modern responsive design
- Streaming audio playback

### Backend
- Node.js
- Express.js
- PostgreSQL database
- Sequelize ORM
- JWT authentication
- WebSockets for streaming

## Installation

### Prerequisites
- Node.js (v16+)
- PostgreSQL

### Setup

1. Clone the repository
```
git clone https://github.com/Ahmed-2451/Spotify-Clone
cd Spotify-Clone
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following:
```
# Database Configuration
DB_NAME=spotify
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Server Configuration
PORT=3001

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# OpenRouter API (for chatbot)
OPENROUTER_API_KEY=your_openrouter_api_key
MAX_HISTORY_LENGTH=20
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

4. Start the backend server
```
node server.js
```

5. Open the frontend in your browser
```
http://localhost:3001
```

## Chatbot Features

The application includes two AI-powered chatbots:

1. **Music Assistant**: Helps with music recommendations, playlist creation, and app features
2. **General Assistant**: Answers general questions and provides conversation

## Project Structure

- `/backend`: Node.js server, API endpoints, database models
  - `/config`: Database and authentication configuration
  - `/models`: Sequelize data models
  - `/routes`: API route handlers
  - `/services`: Business logic and services
  - `/middleware`: Express middleware
- `/frontend`: Client-side application
  - `/CSS`: Stylesheets
  - `/js`: JavaScript modules
  - `/images`: Static images

## Future Enhancements

- Social features (follow users, share playlists)
- Advanced recommendation engine
- Mobile app version
- Offline mode

## License

MIT License - See LICENSE file for details. 
