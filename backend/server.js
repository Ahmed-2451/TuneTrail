const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const Users = require('./models/users');
const sequelize = require('./db');

const app = express();

app.use(cors({
    origin: 'http://localhost:5500',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'spotify',
    password: 'wendy', 
    port: 5432,
});

async function initializeDatabase() {
    try {
        // Sync Sequelize models
        await sequelize.sync({ alter: true });
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tracks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                artist VARCHAR(255) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                album VARCHAR(255) NOT NULL,
                date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cover_url VARCHAR(255)
            )
        `);

        const { rows } = await pool.query('SELECT * FROM tracks');
        if (rows.length === 0) {
            await pool.query(`
                INSERT INTO tracks (title, artist, filename, album, cover_url)
                VALUES 
                ('K.', 'Cigarettes After Sex', 'K. - Cigarettes After Sex.mp3', 'K.', '/images/image.jpg'),
                ('Cry', 'Cigarettes After Sex', 'Cry - Cigarettes After Sex.mp3', 'Cry', '/images/image.jpg'),
                ('Apocalypse', 'Cigarettes After Sex', 'Apocalypse - Cigarettes After Sex.mp3', 'Apocalypse', '/images/image.jpg')
            `);
        }
    } catch (err) {
        console.error('Database initialization error:', err);
    }
}

// Create admin account on server start
async function createAdminAccount() {
    try {
        const adminExists = await Users.findOne({
            where: { email: 'admin@spotify.com' }
        });

        if (!adminExists) {
            await Users.create({
                username: 'admin',
                email: 'admin@spotify.com',
                password: 'admin123', // In a real app, you should hash passwords
                name: 'Admin User',
                isAdmin: true
            });
            console.log('Admin account created');
        }
    } catch (error) {
        console.error('Error creating admin account:', error);
    }
}

initializeDatabase();

// Call createAdminAccount when server starts
createAdminAccount();

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/tracks', (req, res, next) => {
    res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/mpeg',
    });
    next();
}, express.static(path.join(__dirname, 'tracks')));

app.get('/api/tracks', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM tracks ORDER BY date_added DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

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
        const { rows } = await pool.query('SELECT COUNT(*) FROM tracks');
        const totalTracks = parseInt(rows[0].count);
        playbackState.currentTrackIndex = (playbackState.currentTrackIndex + 1) % totalTracks;
        res.json(playbackState);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/playback/previous', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) FROM tracks');
        const totalTracks = parseInt(rows[0].count);
        playbackState.currentTrackIndex = (playbackState.currentTrackIndex - 1 + totalTracks) % totalTracks;
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

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await Users.findOne({
            where: {
                email: email,
                password: password // In a real app, you should hash passwords
            }
        });

        if (user && user.isAdmin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// User signup endpoint
app.post('/api/signup', async (req, res) => {
    const { email, password, name, username } = req.body;
    
    try {
        const user = await Users.create({
            email,
            password, // In a real app, you should hash passwords
            name,
            username,
            isAdmin: false
        });
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Error creating user' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await Users.findOne({
            where: {
                email: email,
                password: password // In a real app, you should hash passwords
            }
        });

        if (user) {
            // Check if the email is the admin email
            const isAdmin = email === 'admin@spotify.com';
            
            res.json({ 
                success: true,
                isAdmin: isAdmin
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
