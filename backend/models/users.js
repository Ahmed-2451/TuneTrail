//a new user signs up and doesn't upload a profile picture
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Users = sequelize.define('Users', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  profileImage: {
    type: DataTypes.STRING,
    defaultValue: 'defaultpfp.jpg'//a new user signs up and doesn't upload a profile picture
  }
});

module.exports = Users;