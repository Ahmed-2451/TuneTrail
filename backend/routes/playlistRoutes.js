const express = require('express');
const router = express.Router();

// In-memory playlist storage (you could use a database instead)
let playlists = [];

// Create a new playlist
router.post('/', async (req, res) => {
    try {
        const { name, description, isPublic, userId } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }
        
        const newPlaylist = {
            id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            description: description?.trim() || '',
            isPublic: isPublic !== undefined ? isPublic : true,
            userId: userId || 'default',
            tracks: [],
            trackCount: 0,
            duration: 0,
            artwork_url: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            owner: 'You'
        };
        
        playlists.push(newPlaylist);
        
        res.status(201).json({
            success: true,
            data: newPlaylist,
            message: 'Playlist created successfully'
        });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create playlist',
            message: error.message 
        });
    }
});

// Get user playlists
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const userPlaylists = playlists.filter(playlist => 
            playlist.userId === userId || playlist.userId === 'default'
        );
        
        res.json({
            success: true,
            data: userPlaylists,
            total: userPlaylists.length
        });
    } catch (error) {
        console.error('Error fetching user playlists:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch playlists',
            message: error.message 
        });
    }
});

// Get specific playlist
router.get('/:playlistId', async (req, res) => {
    try {
        const { playlistId } = req.params;
        
        const playlist = playlists.find(p => p.id === playlistId);
        
        if (!playlist) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        res.json({
            success: true,
            data: playlist
        });
    } catch (error) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch playlist',
            message: error.message 
        });
    }
});

// Add track to playlist
router.post('/:playlistId/tracks', async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { track } = req.body;
        
        if (!track || !track.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Track data is required' 
            });
        }
        
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        const playlist = playlists[playlistIndex];
        
        // Check if track already exists in playlist
        const trackExists = playlist.tracks.some(t => t.id === track.id);
        
        if (trackExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'Track already exists in playlist' 
            });
        }
        
        // Add track to playlist
        const trackData = {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album || track.title || 'Unknown Album',
            duration: track.duration || 180,
            artwork_url: track.artwork_url,
            stream_url: track.stream_url,
            genre: track.genre,
            source: track.source || 'external',
            addedAt: new Date().toISOString()
        };
        
        playlist.tracks.push(trackData);
        playlist.trackCount = playlist.tracks.length;
        playlist.duration += trackData.duration;
        playlist.updatedAt = new Date().toISOString();
        
        // Update the playlist in the array
        playlists[playlistIndex] = playlist;
        
        res.json({
            success: true,
            data: playlist,
            message: `Added "${track.title}" to "${playlist.name}"`
        });
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add track to playlist',
            message: error.message 
        });
    }
});

// Get playlist tracks
router.get('/:playlistId/tracks', async (req, res) => {
    try {
        const { playlistId } = req.params;
        
        const playlist = playlists.find(p => p.id === playlistId);
        
        if (!playlist) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        res.json({
            success: true,
            data: playlist.tracks,
            total: playlist.tracks.length,
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                trackCount: playlist.trackCount,
                duration: playlist.duration
            }
        });
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch playlist tracks',
            message: error.message 
        });
    }
});

// Update playlist
router.put('/:playlistId', async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { name, description, isPublic } = req.body;
        
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        // Update playlist
        if (name !== undefined) playlists[playlistIndex].name = name.trim();
        if (description !== undefined) playlists[playlistIndex].description = description.trim();
        if (isPublic !== undefined) playlists[playlistIndex].isPublic = isPublic;
        playlists[playlistIndex].updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            data: playlists[playlistIndex],
            message: 'Playlist updated successfully'
        });
    } catch (error) {
        console.error('Error updating playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update playlist',
            message: error.message 
        });
    }
});

// Delete playlist
router.delete('/:playlistId', async (req, res) => {
    try {
        const { playlistId } = req.params;
        
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        const deletedPlaylist = playlists.splice(playlistIndex, 1)[0];
        
        res.json({
            success: true,
            data: deletedPlaylist,
            message: 'Playlist deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete playlist',
            message: error.message 
        });
    }
});

// Remove track from playlist
router.delete('/:playlistId/tracks/:trackId', async (req, res) => {
    try {
        const { playlistId, trackId } = req.params;
        
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Playlist not found' 
            });
        }
        
        const playlist = playlists[playlistIndex];
        const trackIndex = playlist.tracks.findIndex(t => t.id === trackId);
        
        if (trackIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Track not found in playlist' 
            });
        }
        
        const removedTrack = playlist.tracks.splice(trackIndex, 1)[0];
        playlist.trackCount = playlist.tracks.length;
        playlist.duration -= removedTrack.duration;
        playlist.updatedAt = new Date().toISOString();
        
        playlists[playlistIndex] = playlist;
        
        res.json({
            success: true,
            data: playlist,
            message: `Removed "${removedTrack.title}" from "${playlist.name}"`
        });
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove track from playlist',
            message: error.message 
        });
    }
});

module.exports = router; 