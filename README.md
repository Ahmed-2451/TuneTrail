# Spotify Clone

A web-based Spotify clone with music playback, playlists, and an AI chatbot assistant.

## Project Structure

- **Frontend**: HTML/CSS/JavaScript web interface
- **Backend**: Express.js server with PostgreSQL database
- **AI Chatbot**: Music assistant powered by DataStax Astra's Langflow API

## Features

- Music playback controls (play, pause, next, previous)
- User profiles and playlists
- Search functionality for tracks and artists
- AI chatbot assistant for music recommendations and help

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   # Astra DB Langflow API Configuration
   ASTRA_API_URL=your_astra_api_url
   ASTRA_TOKEN=your_astra_token
   
   # Fallback settings
   USE_FALLBACK=true
   
   # Database Configuration
   DB_NAME=spotify_clone
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   
   # Server Configuration
   PORT=3001
   JWT_SECRET=your_jwt_secret_key
   
   # Max chat history length
   MAX_HISTORY_LENGTH=20



   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

4. Start the backend server:
   ```
   node server.js
   ```

### Frontend Setup

1. Open another terminal and navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Serve the frontend using a local web server. For example, with the LiveServer VSCode extension or any static file server.

3. Access the application at `http://localhost:8080` (or your configured port).

## Security

- **API Tokens**: Never commit your API tokens to the repository. Use the `.env` file which is excluded in `.gitignore`.
- **Environment Variables**: Keep sensitive configuration in environment variables.
- **Token Rotation**: Regularly rotate your security tokens.

## AI Chatbot

The AI chatbot helps users discover music and provides assistance with the app. It operates in two modes:

1. **Astra DB Langflow API**: Uses external AI service for responses
2. **Fallback Service**: Uses a local service with predefined responses

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL, Sequelize ORM
- **AI**: DataStax Astra Langflow API

## License

MIT License 
