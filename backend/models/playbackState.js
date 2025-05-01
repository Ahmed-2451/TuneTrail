const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlaybackState = sequelize.define('PlaybackState', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    currentSongId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    currentTime: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    isPlaying: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    volume: {
        type: DataTypes.FLOAT,
        defaultValue: 1
    },
    shuffle: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    repeat: {
        type: DataTypes.STRING,
        defaultValue: 'none'
    }
});

module.exports = PlaybackState; 