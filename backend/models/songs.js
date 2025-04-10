const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const songs = sequelize.define('songs', {
  title: {
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
  }
});

module.exports = songs;