const express = require('express');
const router = express.Router();
const { songs } = require('../models');
const { Op } = require('sequelize');

router.get('/songs', async (req, res) => {
    try {
        const allSongs = await songs.findAll();
        res.json(allSongs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching songs' });
    }
});

router.get('/songs/:id', async (req, res) => {
    try {
        const song = await songs.findByPk(req.params.id);
        if (song) {
            res.json(song);
        } else {
            res.status(404).json({ error: 'Song not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching song' });
    }
});

router.put('/songs/:id/play', async (req, res) => {
    try {
        const song = await songs.findByPk(req.params.id);
        if (song) {
            await song.increment('plays');
            await song.update({ lastPlayed: new Date() });
            res.json(song);
        } else {
            res.status(404).json({ error: 'Song not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating play count' });
    }
});

router.get('/songs/search/:query', async (req, res) => {
    try {
        const songs = await songs.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.iLike]: `%${req.params.query}%` } },
                    { artist: { [Op.iLike]: `%${req.params.query}%` } }
                ]
            }
        });
        res.json(songs);
    } catch (error) {
        res.status(500).json({ error: 'Error searching songs' });
    }
});

module.exports = router; 