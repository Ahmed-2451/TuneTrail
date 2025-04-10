const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Playlist = sequelize.define('Playlist', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  coverImage: {
    type: DataTypes.STRING,
    defaultValue: 'defaultplaylist.jpg'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Playlist;