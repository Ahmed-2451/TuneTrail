require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const Users = require('./models/users');
const sequelize = require('./config/db');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const chatbotRoutes = require('./routes/chatbotRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const { createServer } = require('http');
const { initializeSocketIO } = require('./streaming');

const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocketIO(server);

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? '*' // Allow all origins in production
        : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Log all incoming requests in production for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Special case for Google OAuth callback URLs - handle both with and without /api prefix
app.get('/auth/google/callback', (req, res) => {
    console.log('Redirecting Google callback to /api/auth/google/callback');
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString() 
        : '';
    res.redirect(`/api/auth/google/callback${queryString}`);
});

// Handle additional Google OAuth callback patterns
app.get('/google/callback', (req, res) => {
    console.log('Redirecting from /google/callback to /api/auth/google/callback');
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString() 
        : '';
    res.redirect(`/api/auth/google/callback${queryString}`);
});

app.get('/callback', (req, res) => {
    console.log('Redirecting from /callback to /api/auth/google/callback');
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString() 
        : '';
    res.redirect(`/api/auth/google/callback${queryString}`);
});

// Auth routes
app.use('/api/auth', authRoutes);

// Chatbot routes
app.use('/api/chatbot', chatbotRoutes);

// Playlist routes
app.use('/api/playlists', playlistRoutes);

// API root route
app.get('/api', (req, res) => {
    res.json({ 
        message: 'TuneTrail API Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/audius/trending',
            '/api/audius/search',
            '/api/playback-state',
            '/api/liked-songs'
        ]
    });
});

// Function to filter and search sample tracks
function searchSampleTracks(query = '', genre = null, limit = 20) {
    let filteredTracks = [...SAMPLE_TRACKS];
    
    // Filter by search query
    if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        filteredTracks = filteredTracks.filter(track => 
            track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.genre.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by genre
    if (genre) {
        filteredTracks = filteredTracks.filter(track =>
            track.genre.toLowerCase().includes(genre.toLowerCase())
        );
    }
    
    // Duplicate tracks to have more results and randomize order
    const extendedTracks = [];
    for (let i = 0; i < Math.ceil(limit / SAMPLE_TRACKS.length); i++) {
        extendedTracks.push(...filteredTracks.map((track, index) => ({
            ...track,
            id: `${track.id}_${i}_${index}`,
            title: `${track.title} ${i > 0 ? `(Version ${i + 1})` : ''}`.trim()
        })));
    }
    
    // Shuffle and limit results
    const shuffled = extendedTracks.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tunetrail',
    password: process.env.DB_PASSWORD || 'postgres', 
    port: process.env.DB_PORT || 5432,
    max: 20, // maximum number of clients in pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // return error after 5 seconds if connection could not be established
    maxUses: 7500, // close (and replace) a connection after it has been used 7500 times
});

// Add connection error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function initializeDatabase() {
    const maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`Database initialization attempt ${retryCount + 1}/${maxRetries}...`);
            
            // Test database connection first
            console.log('Testing database connection...');
            await pool.query('SELECT NOW()');
            console.log('Database connection successful');
            
            console.log('Syncing Sequelize models...');
            // Use force in development, alter in production
            const syncOptions = process.env.NODE_ENV === 'development' 
                ? { force: true } 
                : { alter: true };
            
            await sequelize.sync(syncOptions);
            console.log('Sequelize models synced successfully');
            
            // Create user_liked_songs table
            console.log('Creating user_liked_songs table if not exists...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_liked_songs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    track_id VARCHAR(255) NOT NULL,
                    track_source VARCHAR(50) DEFAULT 'local',
                    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, track_id, track_source)
                )
            `);
            
            // Add track_source column if it doesn't exist (for existing databases)
            try {
                await pool.query(`
                    ALTER TABLE user_liked_songs 
                    ADD COLUMN IF NOT EXISTS track_source VARCHAR(50) DEFAULT 'local'
                `);
            } catch (err) {
                console.log('Track_source column may already exist:', err.message);
            }
            
            // Create index for faster queries
            try {
                await pool.query(`
                    CREATE INDEX IF NOT EXISTS idx_user_liked_songs_user_track 
                    ON user_liked_songs(user_id, track_id, track_source)
                `);
            } catch (err) {
                console.log('Index may already exist:', err.message);
            }

            // Create external_tracks table for Audius and other external tracks
            console.log('Creating external_tracks table if not exists...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS external_tracks (
                    id VARCHAR(255) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    artist VARCHAR(255) NOT NULL,
                    album VARCHAR(255),
                    duration INTEGER,
                    artwork_url TEXT,
                    stream_url TEXT,
                    source VARCHAR(50) DEFAULT 'audius',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Add album column if it doesn't exist (for existing databases)
            try {
                await pool.query(`
                    ALTER TABLE external_tracks 
                    ADD COLUMN IF NOT EXISTS album VARCHAR(255)
                `);
            } catch (err) {
                console.log('Album column may already exist:', err.message);
            }
            
            // Add updated_at column if it doesn't exist
            try {
                await pool.query(`
                    ALTER TABLE external_tracks 
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                `);
            } catch (err) {
                console.log('Updated_at column may already exist:', err.message);
            }

            // Create user_liked_external_tracks table
            console.log('Creating user_liked_external_tracks table if not exists...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_liked_external_tracks (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    track_id VARCHAR(255) NOT NULL,
                    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, track_id)
                )
            `);

            return;
        } catch (err) {
            console.error('Database initialization error:', err);
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`Retrying in ${Math.pow(2, retryCount) * 1000} milliseconds...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            } else {
                throw err;
            }
        }
    }
}

initializeDatabase();

// Only serve static files in production mode
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

// Serve images from backend/images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

let playbackState = {
    currentTrackIndex: 0,
    isPlaying: false,
    volume: 1,
    progress: 0
};

app.get('/api/playback-state', (req, res) => {
    res.json(playbackState);
});

app.post('/api/playback/toggle', async (req, res) => {
    try {
        playbackState.isPlaying = !playbackState.isPlaying;
        res.json(playbackState);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/playback/next', async (req, res) => {
    try {
        // Since we no longer have local tracks, just toggle playback state
        res.json(playbackState);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/playback/previous', async (req, res) => {
    try {
        // Since we no longer have local tracks, just toggle playback state
        res.json(playbackState);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/playback/volume', (req, res) => {
    const { volume } = req.body;
    if (typeof volume === 'number') {
        playbackState.volume = Math.max(0, Math.min(1, volume));
    }
    res.json(playbackState);
});

// Liked songs endpoints
app.get('/api/liked-songs', async (req, res) => {
    try {
        const userId = req.query.userId || 1;
        
        // Get external tracks from the unified user_liked_songs table
        const externalTracks = await pool.query(`
            SELECT 
                uls.track_id as id,
                et.title,
                et.artist,
                et.duration,
                et.artwork_url,
                et.stream_url,
                'external' as source,
                uls.liked_at
            FROM user_liked_songs uls
            LEFT JOIN external_tracks et ON uls.track_id = et.id
            WHERE uls.user_id = $1 AND uls.track_source = 'external'
        `, [userId]);
        
        // Sort by liked_at
        const allTracks = externalTracks.rows
            .sort((a, b) => new Date(b.liked_at) - new Date(a.liked_at));
        
        res.json(allTracks);
    } catch (err) {
        console.error('Error fetching liked songs:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// User-specific liked songs endpoint (matches frontend expectation)
app.get('/api/users/:userId/liked-songs', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        console.log(`🎵 Loading liked songs for user ${userId}`);
        
        // Get external tracks with all required fields including fallback album
        const externalTracks = await pool.query(`
            SELECT 
                uls.track_id as id,
                COALESCE(et.title, 'Unknown Title') as title,
                COALESCE(et.artist, 'Unknown Artist') as artist,
                COALESCE(et.album, et.title, 'Unknown Album') as album,
                et.duration,
                et.artwork_url,
                et.artwork_url as cover_url,
                et.stream_url,
                'external' as source,
                uls.liked_at,
                et.source as external_source,
                et.created_at as date_added
            FROM user_liked_songs uls
            LEFT JOIN external_tracks et ON uls.track_id = et.id
            WHERE uls.user_id = $1 AND uls.track_source = 'external'
        `, [userId]);
        
        // Process and enhance tracks with fallbacks and validation
        const processedExternalTracks = externalTracks.rows.map(track => ({
            ...track,
            // Ensure we have valid image URLs with fallbacks
            artwork_url: track.artwork_url || '/images/placeholder.jpg',
            cover_url: track.cover_url || track.artwork_url || '/images/placeholder.jpg',
            // Ensure all required fields are present
            title: track.title || 'Unknown Title',
            artist: track.artist || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration || 180, // Default 3:00 for external tracks
            // Add date_added for consistency
            date_added: track.date_added || track.liked_at
        }));
        
        // Sort by liked_at (most recent first)
        const allTracks = processedExternalTracks
            .sort((a, b) => new Date(b.liked_at) - new Date(a.liked_at));
        
        console.log(`✅ Found ${allTracks.length} liked tracks for user ${userId}`);
        
        // Log sample track for debugging
        if (allTracks.length > 0) {
            console.log('Sample track structure:', {
                id: allTracks[0].id,
                title: allTracks[0].title,
                artist: allTracks[0].artist,
                album: allTracks[0].album,
                cover_url: allTracks[0].cover_url,
                artwork_url: allTracks[0].artwork_url,
                source: allTracks[0].source,
                liked_at: allTracks[0].liked_at
            });
        }

        res.json(allTracks);
    } catch (err) {
        console.error('Error fetching user liked songs:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user's liked track IDs
app.get('/api/tracks/liked-status', async (req, res) => {
    try {
        const userId = req.query.userId || 1; // Default to user ID 1 if not specified
        
        // Get external track IDs only
        const likedTracks = await pool.query(
            'SELECT track_id FROM user_liked_songs WHERE user_id = $1 AND track_source = $2',
            [userId, 'external']
        );
        
        // Return external track IDs only
        const allLikedTrackIds = likedTracks.rows.map(row => row.track_id);
        
        res.json(allLikedTrackIds);
    } catch (err) {
        console.error('Error fetching liked track IDs:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// External track like endpoints
app.post('/api/external-tracks/:id/like', async (req, res) => {
    try {
        const trackId = req.params.id;
        const userId = req.body.userId || 1;
        const trackData = req.body.trackData; // Contains track info for saving
        
        // Input validation
        if (!trackId || !trackId.trim()) {
            return res.status(400).json({ error: 'Track ID is required' });
        }

        // Test database connection
        await pool.query('SELECT 1');
        
        // First, ensure the external track exists in our database
        if (trackData) {
            try {
                await pool.query(`
                    INSERT INTO external_tracks (id, title, artist, album, duration, artwork_url, stream_url, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        artist = EXCLUDED.artist,
                        album = EXCLUDED.album,
                        duration = EXCLUDED.duration,
                        artwork_url = EXCLUDED.artwork_url,
                        stream_url = EXCLUDED.stream_url,
                        updated_at = NOW()
                `, [
                    trackId, 
                    trackData.title || '', 
                    trackData.artist || '', 
                    trackData.album || trackData.title || '',
                    trackData.duration || 0, 
                    trackData.artwork_url || '', 
                    trackData.stream_url || '', 
                    'audius'
                ]);
            } catch (insertError) {
                console.error('Error inserting/updating external track:', insertError);
                // Continue with like operation even if track insertion fails
            }
        }
        
        // Check if already liked in the unified table
        const { rows } = await pool.query(
            'SELECT * FROM user_liked_songs WHERE user_id = $1 AND track_id = $2 AND track_source = $3',
            [userId, trackId, 'external']
        );
        
        if (rows.length > 0) {
            // Unlike: Remove from liked songs
            await pool.query(
                'DELETE FROM user_liked_songs WHERE user_id = $1 AND track_id = $2 AND track_source = $3',
                [userId, trackId, 'external']
            );
            res.json({ liked: false, message: 'Track unliked successfully' });
        } else {
            // Like: Add to liked songs
            await pool.query(
                'INSERT INTO user_liked_songs (user_id, track_id, track_source, liked_at) VALUES ($1, $2, $3, NOW())',
                [userId, trackId, 'external']
            );
            res.json({ liked: true, message: 'Track liked successfully' });
        }
    } catch (err) {
        console.error('Error toggling external track like status:', err);
        
        // Check if it's a connection error
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            res.status(503).json({ 
                error: 'Database connection failed', 
                message: 'Please try again in a moment'
            });
        } else if (err.code === '42P01') { // Table doesn't exist
            res.status(500).json({ 
                error: 'Database schema error', 
                message: 'Please run database migrations'
            });
        } else {
            res.status(500).json({ 
                error: 'Database error', 
                message: 'Failed to update like status'
            });
        }
    }
});

// User signup endpoint
app.post('/api/signup', async (req, res) => {
    const { email, password, name, username } = req.body;
    
    try {
        console.log(`Signup attempt for: ${email}, username: ${username}`);
        const user = await Users.create({
            email,
            password, // In a real app, you should hash passwords
            name,
            username
        });
        
        console.log(`User created successfully: ${email}`);
        
        // Generate a simple token (in production, use JWT)
        const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        
        res.json({ 
            success: true, 
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username || user.name
            }
        });
    } catch (error) {
        console.error('Signup error details:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                success: false, 
                error: 'Email or username already exists' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error creating user'
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log(`Login attempt for: ${email}`);
        const user = await Users.findOne({
            where: {
                email: email,
                password: password // In a real app, you should hash passwords
            }
        });

        if (user) {
            console.log(`Login successful for: ${email}`);
            
            // Generate a simple token (in production, use JWT)
            const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
            
            res.json({ 
                success: true,
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username || user.name
                }
            });
        } else {
            console.log(`Login failed for: ${email} - Invalid credentials`);
            res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
    } catch (error) {
        console.error('Login error details:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error'
        });
    }
});

// Test endpoint to debug Audius streaming
app.get('/api/audius/test-stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Testing stream for track ID: ${id}`);
        
        const response = await makeFMARequest(`/tracks/${id}/stream`);
        
        // Test multiple URL patterns
        const testUrls = [
            `${FMA_API_HOST}/tracks/${id}/stream`,
            `${FMA_API_HOST}/tracks/${id}/stream`,
            `${FMA_API_HOST}/content/${id}/stream?app_name=TuneTrail`,
        ];
        
        const results = [];
        
        for (const url of testUrls) {
            try {
                console.log(`Testing URL: ${url}`);
                const testResponse = await fetch(url, { 
                    method: 'HEAD',
                    timeout: 5000 
                });
                
                results.push({
                    url,
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    contentType: testResponse.headers.get('content-type'),
                    contentLength: testResponse.headers.get('content-length'),
                    success: testResponse.ok
                });
            } catch (error) {
                results.push({
                    url,
                    error: error.message,
                    success: false
                });
            }
        }
        
        res.json({
            trackId: id,
            host: FMA_API_HOST,
            results,
            recommendation: results.find(r => r.success)?.url || 'No working URL found'
        });
        
    } catch (error) {
        console.error('Stream test error:', error);
        res.status(500).json({ 
            error: 'Failed to test stream URLs',
            message: error.message 
        });
    }
});

// Test endpoint to check Audius API status
app.get('/api/audius/status', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Test current host
        let currentHostStatus = 'unknown';
        if (FMA_API_HOST) {
            try {
                const testResponse = await fetch(`${FMA_API_HOST}/tracks/trending?limit=1&app_name=TuneTrail`, {
                    timeout: 5000
                });
                currentHostStatus = testResponse.ok ? 'working' : 'failed';
            } catch (error) {
                currentHostStatus = 'failed';
            }
        }
        
        res.json({
            currentHost: FMA_API_HOST,
            currentHostStatus: currentHostStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Audius status check error:', error);
        res.status(500).json({ 
            error: 'Failed to check Audius API status',
            currentHost: FMA_API_HOST,
            timestamp: new Date().toISOString()
        });
    }
});

// Test audio endpoint for debugging
app.get('/api/test-audio', (req, res) => {
    // Generate a simple sine wave audio for testing
    const duration = 2 // 2 seconds
    const sampleRate = 44100
    const frequency = 440 // A4 note
    
    const samples = duration * sampleRate
    const buffer = Buffer.alloc(samples * 2) // 16-bit audio
    
    for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5
        const intSample = Math.round(sample * 32767)
        buffer.writeInt16LE(intSample, i * 2)
    }
    
    res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
    })
    
    // Simple WAV header
    const wavHeader = Buffer.alloc(44)
    wavHeader.write('RIFF', 0)
    wavHeader.writeUInt32LE(36 + buffer.length, 4)
    wavHeader.write('WAVE', 8)
    wavHeader.write('fmt ', 12)
    wavHeader.writeUInt32LE(16, 16) // PCM format
    wavHeader.writeUInt16LE(1, 20) // PCM
    wavHeader.writeUInt16LE(1, 22) // Mono
    wavHeader.writeUInt32LE(sampleRate, 24)
    wavHeader.writeUInt32LE(sampleRate * 2, 28)
    wavHeader.writeUInt16LE(2, 32)
    wavHeader.writeUInt16LE(16, 34)
    wavHeader.write('data', 36)
    wavHeader.writeUInt32LE(buffer.length, 40)
    
    res.send(Buffer.concat([wavHeader, buffer]))
})

// Test endpoint to debug Audius streaming issues
app.get('/api/audius/debug/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Debugging track ID: ${id}`);
        
        // First get track details
        const trackResponse = await makeFMARequest(`/tracks/${id}/stream`);
        const trackData = await trackResponse.json();
        
        if (!trackData.data) {
            return res.json({ error: 'Track not found', trackId: id });
        }
        
        const track = trackData.data;
        
        // Try different streaming approaches
        const debugInfo = {
            trackId: id,
            trackTitle: track.title,
            trackArtist: track.artist,
            isStreamable: track.is_streamable,
            trackSegments: track.track_segments,
            permalink: track.permalink,
            tests: []
        };
        
        // Test 1: Direct Audius stream endpoint
        try {
            const streamResponse = await makeFMARequest(`/tracks/${id}/stream`);
            debugInfo.tests.push({
                method: 'Direct Stream',
                url: `${FMA_API_HOST}/tracks/${id}/stream?app_name=TuneTrail`,
                status: streamResponse.status,
                statusText: streamResponse.statusText,
                contentType: streamResponse.headers.get('content-type'),
                contentLength: streamResponse.headers.get('content-length'),
                success: streamResponse.ok
            });
        } catch (error) {
            debugInfo.tests.push({
                method: 'Direct Stream',
                error: error.message,
                success: false
            });
        }
        
        // Test 2: Alternative streaming endpoints
        const alternativeEndpoints = [
            'stream',
            'download',
            'listen'
        ];
        
        for (const endpoint of alternativeEndpoints) {
            try {
                const testResponse = await makeFMARequest(`/tracks/${id}/${endpoint}`);
                debugInfo.tests.push({
                    method: `Alternative: ${endpoint}`,
                    status: testResponse.status,
                    success: testResponse.ok,
                    contentType: testResponse.headers.get('content-type')
                });
            } catch (error) {
                debugInfo.tests.push({
                    method: `Alternative: ${endpoint}`,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Check if there are working streaming URLs in track segments
        if (track.track_segments && track.track_segments.length > 0) {
            debugInfo.trackSegmentsInfo = track.track_segments.map(segment => ({
                multihash: segment.multihash,
                duration: segment.duration
            }));
        }
        
        res.json(debugInfo);
        
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({
            error: 'Debug failed',
            message: error.message,
            trackId: req.params.id
        });
    }
});

// Get trending/popular tracks using sample data
app.get('/api/music/trending', async (req, res) => {
    try {
        const { genre, limit = 20 } = req.query;
        
        console.log(`Getting trending tracks - genre: ${genre}, limit: ${limit}`);
        
        const tracks = searchSampleTracks('', genre, parseInt(limit));
        
        res.json({ 
            data: tracks,
            success: true,
            source: 'sample',
            message: 'Sample tracks for demonstration'
        });
    } catch (error) {
        console.error('Sample trending API error:', error);
        res.status(500).json({ 
            data: [],
            error: 'Unable to fetch trending tracks',
            message: error.message
        });
    }
});

// Search tracks using sample data
app.get('/api/music/search', async (req, res) => {
    try {
        const { query, genre, limit = 20 } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        console.log(`Searching tracks - query: ${query}, genre: ${genre}, limit: ${limit}`);
        
        const tracks = searchSampleTracks(query, genre, parseInt(limit));
        
        res.json({ 
            data: tracks,
            success: true,
            query: query,
            message: `Found ${tracks.length} sample tracks matching "${query}"`
        });
    } catch (error) {
        console.error('Sample search error:', error);
        res.status(500).json({ 
            error: 'Failed to search tracks',
            message: error.message
        });
    }
});

// Get track details
app.get('/api/music/track/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find track by ID (handle duplicated IDs from extended tracks)
        const baseId = id.split('_')[0] + '_' + id.split('_')[1]; // Get original ID like 'sample_1'
        const track = SAMPLE_TRACKS.find(t => t.id === baseId);
        
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Create full track details
        const fullTrack = {
            ...track,
            id: id, // Use the requested ID
            lyrics: 'This is a sample track for demonstration purposes.\nLyrics would be displayed here in a real implementation.',
            instruments: 'Various',
            vocals: 'Instrumental',
            speed: 'Medium',
            release_date: '2024-01-01',
            share_url: `${req.protocol}://${req.get('host')}/track/${id}`,
            license: 'Creative Commons',
        };
        
        res.json({ data: fullTrack });
    } catch (error) {
        console.error('Sample track details error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch track details',
            message: error.message
        });
    }
});

// Get tracks by genre
app.get('/api/music/genre/:genre', async (req, res) => {
    try {
        const { genre } = req.params;
        const { limit = 20 } = req.query;
        
        console.log(`Getting tracks by genre: ${genre}, limit: ${limit}`);
        
        const tracks = searchSampleTracks('', genre, parseInt(limit));
        
        res.json({ 
            data: tracks,
            genre: genre,
            success: true,
            message: `Sample ${genre} tracks`
        });
    } catch (error) {
        console.error('Sample genre API error:', error);
        res.status(500).json({ 
            data: [],
            error: `Unable to fetch ${genre} tracks`,
            message: error.message
        });
    }
});

// Stream music file (redirect to test audio)
app.get('/api/music/stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Extract track info from ID
        const baseId = id.split('_')[0] + '_' + id.split('_')[1];
        const track = SAMPLE_TRACKS.find(t => t.id === baseId);
        
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        // Redirect to the test audio endpoint with track-specific parameters
        const trackNumber = baseId.split('_')[1];
        res.redirect(`/api/test-audio?track=${trackNumber}&duration=${track.duration}`);
        
    } catch (error) {
        console.error('Sample stream error:', error);
        res.status(500).json({ 
            error: 'Failed to stream track',
            message: error.message
        });
    }
});

// Audius API configuration and helpers
const AUDIUS_DISCOVERY_HOST = 'https://api.audius.co';

let currentAudiusHost = null;

// Function to get available Audius hosts and select one
async function selectWorkingAudiusHost() {
    const fetch = (await import('node-fetch')).default;
    
    try {
        console.log('Fetching available Audius hosts...');
        const response = await fetch(AUDIUS_DISCOVERY_HOST, {
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                // Select a random host from the available list
                const randomIndex = Math.floor(Math.random() * data.data.length);
                currentAudiusHost = data.data[randomIndex];
                console.log(`Using Audius host: ${currentAudiusHost}`);
                return currentAudiusHost;
            }
        }
    } catch (error) {
        console.warn('Failed to fetch Audius hosts:', error.message);
    }
    
    // Fallback to a known working host
    currentAudiusHost = 'https://audius-discovery-1.cultur3stake.com';
    console.log(`Using fallback Audius host: ${currentAudiusHost}`);
    return currentAudiusHost;
}

// Initialize Audius host selection
selectWorkingAudiusHost();

// Helper function to make Audius API requests with retry logic
async function makeAudiusRequest(endpoint, retries = 2) {
    const fetch = (await import('node-fetch')).default;
    
    // Ensure we have a host
    if (!currentAudiusHost) {
        await selectWorkingAudiusHost();
    }
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `${currentAudiusHost}/v1${endpoint}`;
            console.log(`Audius API request: ${url}`);
            
            const response = await fetch(url, {
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'TuneTrail/1.0'
                }
            });
            
            if (!response.ok) {
                if (response.status >= 500 && attempt < retries) {
                    // Try next host on server errors
                    await selectWorkingAudiusHost();
                    continue;
                }
                throw new Error(`Audius API error: ${response.status} ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            
            console.warn(`Audius request attempt ${attempt + 1} failed:`, error.message);
            // Try to get a new host
            await selectWorkingAudiusHost();
        }
    }
}

// Audius API Routes

// Get trending tracks
app.get('/api/audius/trending', async (req, res) => {
    try {
        const { genre, time, limit = 20 } = req.query;
        
        let endpoint = `/tracks/trending?limit=${limit}&app_name=TuneTrail`;
        if (genre) endpoint += `&genre=${encodeURIComponent(genre)}`;
        if (time) endpoint += `&time=${encodeURIComponent(time)}`;
        
        const response = await makeAudiusRequest(endpoint);
        const data = await response.json();
        
        // Format response for frontend
        const tracks = data.data?.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            is_streamable: track.is_streamable,
            play_count: track.play_count,
            favorite_count: track.favorite_count,
            repost_count: track.repost_count,
            release_date: track.release_date,
            permalink: track.permalink,
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: tracks,
            total: tracks.length,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius trending error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending tracks',
            message: error.message
        });
    }
});

// Search tracks
app.get('/api/audius/search', async (req, res) => {
    try {
        const { query, genre, only_downloadable, limit = 20 } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }
        
        let endpoint = `/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=TuneTrail`;
        if (genre) endpoint += `&genre=${encodeURIComponent(genre)}`;
        if (only_downloadable === 'true') endpoint += `&only_downloadable=true`;
        
        const response = await makeAudiusRequest(endpoint);
        const data = await response.json();
        
        // Format response for frontend
        const tracks = data.data?.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            is_streamable: track.is_streamable,
            is_downloadable: track.is_downloadable,
            play_count: track.play_count,
            favorite_count: track.favorite_count,
            release_date: track.release_date,
            permalink: track.permalink,
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: tracks,
            total: tracks.length,
            query: query,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search tracks',
            message: error.message
        });
    }
});

// Get track by ID
app.get('/api/audius/track/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const response = await makeAudiusRequest(`/tracks/${id}?app_name=TuneTrail`);
        const data = await response.json();
        
        if (!data.data) {
            return res.status(404).json({
                success: false,
                error: 'Track not found'
            });
        }
        
        const track = data.data;
        const formattedTrack = {
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            description: track.description,
            is_streamable: track.is_streamable,
            is_downloadable: track.is_downloadable,
            play_count: track.play_count,
            favorite_count: track.favorite_count,
            repost_count: track.repost_count,
            release_date: track.release_date,
            permalink: track.permalink,
            tags: track.tags,
            source: 'audius'
        };
        
        res.json({
            success: true,
            data: formattedTrack,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius track error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch track',
            message: error.message
        });
    }
});

// Get bulk tracks
app.get('/api/audius/tracks', async (req, res) => {
    try {
        const { id, permalink } = req.query;
        let endpoint = '/tracks?app_name=TuneTrail';
        
        if (id) {
            const ids = Array.isArray(id) ? id : [id];
            endpoint += `&id=${ids.join('&id=')}`;
        }
        
        if (permalink) {
            const permalinks = Array.isArray(permalink) ? permalink : [permalink];
            endpoint += `&permalink=${permalinks.map(p => encodeURIComponent(p)).join('&permalink=')}`;
        }
        
        const response = await makeAudiusRequest(endpoint);
        const data = await response.json();
        
        const tracks = data.data?.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            is_streamable: track.is_streamable,
            play_count: track.play_count,
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: tracks,
            total: tracks.length,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius bulk tracks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tracks',
            message: error.message
        });
    }
});

// Stream track
app.get('/api/audius/stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const streamResponse = await makeAudiusRequest(`/tracks/${id}/stream?app_name=TuneTrail`);
        
        // Proxy the stream
        res.set({
            'Content-Type': streamResponse.headers.get('content-type') || 'audio/mpeg',
            'Content-Length': streamResponse.headers.get('content-length'),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
        });
        
        streamResponse.body.pipe(res);
    } catch (error) {
        console.error('Audius stream error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stream track',
            message: error.message
        });
    }
});

// Get user playlists from Audius
app.get('/api/audius/users/:userId/playlists', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;
        
        const response = await makeAudiusRequest(`/users/${userId}/playlists?limit=${limit}&app_name=TuneTrail`);
        const data = await response.json();
        
        const playlists = data.data?.map(playlist => ({
            id: playlist.id,
            name: playlist.playlist_name,
            description: playlist.description,
            artwork_url: playlist.artwork ? playlist.artwork['480x480'] || playlist.artwork['150x150'] : null,
            track_count: playlist.track_count,
            is_album: playlist.is_album,
            is_private: playlist.is_private,
            created_at: playlist.created_at,
            updated_at: playlist.updated_at,
            permalink: playlist.permalink,
            owner: playlist.user?.name || 'Unknown User',
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: playlists,
            total: playlists.length,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius user playlists error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user playlists',
            message: error.message
        });
    }
});

// Get playlist tracks
app.get('/api/audius/playlists/:playlistId/tracks', async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { limit = 50 } = req.query;
        
        const response = await makeAudiusRequest(`/playlists/${playlistId}/tracks?limit=${limit}&app_name=TuneTrail`);
        const data = await response.json();
        
        const tracks = data.data?.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            is_streamable: track.is_streamable,
            play_count: track.play_count,
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: tracks,
            total: tracks.length,
            playlist_id: playlistId,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius playlist tracks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch playlist tracks',
            message: error.message
        });
    }
});

// Get underground/new & hot tracks
app.get('/api/audius/underground', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const response = await makeAudiusRequest(`/tracks/trending/underground?limit=${limit}&app_name=TuneTrail`);
        const data = await response.json();
        
        const tracks = data.data?.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user?.name || 'Unknown Artist',
            duration: track.duration,
            artwork_url: track.artwork ? 
                track.artwork['480x480'] || 
                track.artwork['150x150'] || 
                track.artwork['1000x1000'] ||
                Object.values(track.artwork)[0] : null,
            stream_url: `/api/audius/stream/${track.id}`,
            genre: track.genre,
            mood: track.mood,
            is_streamable: track.is_streamable,
            play_count: track.play_count,
            source: 'audius'
        })) || [];
        
        res.json({
            success: true,
            data: tracks,
            total: tracks.length,
            source: 'audius'
        });
    } catch (error) {
        console.error('Audius underground error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch underground tracks',
            message: error.message
        });
    }
});

// Test endpoint to add sample liked songs for testing
app.post('/api/test/populate-liked-songs/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`Adding sample liked songs for user ${userId}`);
        
        // Add some sample external tracks first
        const sampleTracks = [
            {
                id: 'audius_sample_1',
                title: 'Electronic Waves',
                artist: 'Test Artist 1',
                album: 'Electronic Collection',
                duration: 180,
                artwork_url: 'https://via.placeholder.com/300x300/8b5cf6/ffffff?text=Track+1',
                stream_url: '/api/test-audio?track=1&duration=180'
            },
            {
                id: 'audius_sample_2',
                title: 'Ambient Dreams',
                artist: 'Test Artist 2',
                album: 'Ambient Collection',
                duration: 220,
                artwork_url: 'https://via.placeholder.com/300x300/ec4899/ffffff?text=Track+2',
                stream_url: '/api/test-audio?track=2&duration=220'
            },
            {
                id: 'audius_sample_3',
                title: 'Jazz Fusion',
                artist: 'Test Artist 3',
                album: 'Jazz Collection',
                duration: 195,
                artwork_url: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=Track+3',
                stream_url: '/api/test-audio?track=3&duration=195'
            }
        ];
        
        // Insert external tracks
        for (const track of sampleTracks) {
            await pool.query(`
                INSERT INTO external_tracks (id, title, artist, album, duration, artwork_url, stream_url, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    artist = EXCLUDED.artist,
                    album = EXCLUDED.album,
                    duration = EXCLUDED.duration,
                    artwork_url = EXCLUDED.artwork_url,
                    stream_url = EXCLUDED.stream_url,
                    updated_at = NOW()
            `, [
                track.id,
                track.title,
                track.artist,
                track.album,
                track.duration,
                track.artwork_url,
                track.stream_url,
                'audius'
            ]);
            
            // Add to user's liked songs
            await pool.query(`
                INSERT INTO user_liked_songs (user_id, track_id, track_source, liked_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, track_id, track_source) DO NOTHING
            `, [userId, track.id, 'external']);
        }
        
        const totalLiked = sampleTracks.length;
        console.log(`✅ Added ${totalLiked} sample liked songs for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: `Added ${totalLiked} sample liked songs for user ${userId}`,
            external_tracks: sampleTracks.length
        });
    } catch (err) {
        console.error('Error populating sample liked songs:', err);
        res.status(500).json({ 
            error: 'Failed to populate sample liked songs',
            message: err.message 
        });
    }
});

// Debug endpoint to check liked songs data structure
app.get('/api/debug/liked-songs/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔍 Debug: Checking liked songs data for user ${userId}`);
        
        // Get raw data from all related tables
        const userLikedSongs = await pool.query(
            'SELECT * FROM user_liked_songs WHERE user_id = $1 ORDER BY liked_at DESC',
            [userId]
        );
        
        const externalTracks = await pool.query(
            'SELECT * FROM external_tracks ORDER BY created_at DESC LIMIT 10'
        );
        
        // Get the formatted liked songs (same as the main endpoint)
        const formattedResponse = await fetch(`http://localhost:${process.env.PORT || 3002}/api/users/${userId}/liked-songs`);
        const formattedData = await formattedResponse.json();
        
        res.json({
            debug_info: {
                user_id: userId,
                timestamp: new Date().toISOString(),
                total_liked_songs: userLikedSongs.rows.length,
                total_external_tracks: externalTracks.rows.length
            },
            raw_data: {
                user_liked_songs: userLikedSongs.rows,
                external_tracks_sample: externalTracks.rows
            },
            formatted_liked_songs: formattedData,
            schema_info: {
                user_liked_songs_columns: userLikedSongs.rows.length > 0 ? Object.keys(userLikedSongs.rows[0]) : [],
                external_tracks_columns: externalTracks.rows.length > 0 ? Object.keys(externalTracks.rows[0]) : []
            }
        });
        
    } catch (err) {
        console.error('Debug endpoint error:', err);
        res.status(500).json({ 
            error: 'Debug endpoint failed',
            message: err.message 
        });
    }
});

// Frontend fallback route - MUST be last!
// Only serve built frontend in production mode
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
    });
} else {
    // In development mode, return 404 for non-API routes to let Vite handle frontend
    app.get('*', (req, res) => {
        console.log(`\n⚠️  WARNING: Non-API request to backend: ${req.url}`);
        console.log(`🔄 For frontend routes, use: http://localhost:3001${req.url}`);
        console.log(`💡 This backend (port 3002) only serves API endpoints in development\n`);
        
        res.status(404).json({ 
            error: 'Frontend route not found on backend',
            message: 'In development mode, access frontend at http://localhost:3001',
            suggestion: `Try: http://localhost:3001${req.url}`
        });
    });
}

app.use((err, req, res, next) => {
    console.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
