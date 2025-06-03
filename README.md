# 🎵 TuneTrail - Modern Music Streaming Platform

A beautiful Spotify-inspired music streaming application built with React and Node.js, featuring a modern purple-themed UI and real music integration.

![TuneTrail Logo](./frontend/images/tunetrail-logo.png)

## ✨ Features

- 🎨 **Modern UI Design** - Beautiful purple-themed interface inspired by Spotify
- 🎵 **Music Player** - Full-featured audio player with controls, progress bar, and volume
- 🔍 **Search Functionality** - Search for music with real-time results via Audius API
- ❤️ **Liked Songs** - Save and manage your favorite tracks
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🎚️ **Player Controls** - Play, pause, next, previous, shuffle, repeat, volume
- 🎪 **Live Audio Streaming** - Integration with Audius decentralized music platform
- 🔐 **User Authentication** - Login and signup system (demo mode)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Spotify-Clone
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Start the application**
   ```bash
   # Option 1: Use the startup script (recommended)
   node start.js
   
   # Option 2: Manual startup
   # Build frontend first
   cd frontend && npm run build && cd ..
   # Start backend
   cd backend && node server.js
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3001`
   - The API is available at `http://localhost:3001/api`

## 🏗️ Project Structure

```
TuneTrail/
├── backend/                 # Node.js backend server
│   ├── server.js           # Main server file
│   ├── images/             # Static images served by API
│   ├── config/             # Database and auth configuration
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   └── package.json        # Backend dependencies
├── frontend/               # React frontend application
│   ├── src/                # React source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Utility functions
│   ├── dist/               # Built frontend (generated)
│   ├── CSS/                # Stylesheets
│   ├── images/             # Frontend images
│   └── package.json        # Frontend dependencies
└── start.js               # Application startup script
```

## 🎯 API Endpoints

### Music & Streaming
- `GET /api` - Server info and available endpoints
- `GET /api/audius/trending` - Get trending tracks from Audius
- `GET /api/audius/search?query=<term>` - Search for tracks on Audius
- `GET /api/audius/stream/:id` - Stream audio from Audius

### Player Controls
- `GET /api/playback-state` - Get current player state
- `POST /api/playback/toggle` - Play/pause toggle
- `POST /api/playback/next` - Next track
- `POST /api/playback/previous` - Previous track
- `POST /api/playback/volume` - Set volume level

### User Features
- `GET /api/liked-songs` - Get user's liked songs
- `POST /api/external-tracks/:id/like` - Like/unlike a track
- `POST /api/login` - User login (demo)
- `POST /api/signup` - User registration (demo)

## 🎨 Features in Detail

### Music Player
- **Full Controls**: Play, pause, next, previous, shuffle, repeat
- **Progress Bar**: Click to seek, real-time progress updates
- **Volume Control**: Adjustable volume with mute toggle
- **Track Information**: Title, artist, artwork display
- **Loading States**: Visual feedback for track loading

### User Interface
- **Purple Theme**: Modern gradient design with purple accents
- **Responsive Layout**: Mobile-first design that works on all devices
- **Smooth Animations**: CSS transitions and hover effects
- **Grid Layouts**: Organized display of tracks and categories
- **Interactive Elements**: Hover states and click feedback

### Music Integration
- **Audius Integration**: Access to thousands of tracks via Audius API
- **Categories**: Electronic, Hip-Hop, Rock, Pop, Jazz, Classical
- **Search Results**: Real-time search with Audius music database
- **Quick Access**: Recently played, playlists, liked songs

## 🔧 Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
node server.js       # Start backend server
```

## 🚀 Deployment

### Production Build
1. Build the frontend: `cd frontend && npm run build`
2. Start the backend: `cd backend && node server.js`
3. Set environment variables as needed
4. Configure reverse proxy (nginx) if required

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

## 🎵 Music Integration

TuneTrail integrates with the Audius decentralized music platform to provide:

1. **Real Music**: Access to thousands of tracks from independent artists
2. **Search**: Find music by title, artist, or genre
3. **Streaming**: High-quality audio streaming
4. **Trending**: Discover popular and trending tracks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Design inspired by Spotify
- Music powered by Audius decentralized platform
- Icons from Font Awesome
- Built with React, Node.js, and Express

---

**Made with ❤️ by the TuneTrail Team**

🎵 Enjoy your music! 🎵 
