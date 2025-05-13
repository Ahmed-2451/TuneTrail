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

# Google Search API (for real-time web search)
GOOGLE_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Google Auth
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

### Setting up Google Search API for Real-time Data

To enable the chatbots to search the web for real-time information such as weather, news, and current events, you need to set up the Google Custom Search API:

1. Create a Google Cloud Platform account at https://console.cloud.google.com/
2. Create a new project
3. Enable the "Custom Search API" in the API Library
4. Create API credentials to get your API key
5. Go to https://programmablesearchengine.google.com/ to create a Programmable Search Engine
6. Configure your search engine (select "Search the entire web" option)
7. Get your Search Engine ID
8. Add both the API key and Search Engine ID to your `.env` file

Without these credentials, the chatbot will still work but won't be able to provide real-time information.

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
