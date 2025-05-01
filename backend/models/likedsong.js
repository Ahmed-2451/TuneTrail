const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const likedSong = sequelize.define('likedSong', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  likedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  playCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
  
});

module.exports = likedSong;