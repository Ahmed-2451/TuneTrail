const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const songs = sequelize.define('songs', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: false
  },
  audioFile: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coverImage: {
    type: DataTypes.STRING,
    defaultValue: 'defaultsongpic.jpg'
  },
  plays: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastPlayed: {
    type: DataTypes.DATE
  },
  genre: {
    type: DataTypes.STRING
  },
  album: {
    type: DataTypes.STRING
  }
});

module.exports = songs;