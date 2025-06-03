require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Database configuration from environment variables
const dbName = process.env.DB_NAME || 'tunetrail';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

// Create Sequelize instance
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: 'postgres',
  port: dbPort,
  logging: console.log
});

// Define all models directly here for initialization
// Users model
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
    defaultValue: 'defaultpfp.jpg'
  },
  chatHistory: {
    type: DataTypes.JSON,
    defaultValue: []
  }
});

// Define any other models you need here
// For example (adjust according to your actual models):

// Songs model
const Songs = sequelize.define('Songs', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
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
  genre: {
    type: DataTypes.STRING
  },
  album: {
    type: DataTypes.STRING
  }
});

// LikedSong model
const LikedSongs = sequelize.define('LikedSongs', {
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

// Define any associations if needed
// Example: Users.hasMany(LikedSongs);
// Example: LikedSongs.belongsTo(Songs);

// Function to initialize the database
async function initializeDatabase() {
  try {
    // First test the connection
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully');
    
    // Then sync all models - use alter instead of force for production safety
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database sync complete');
    
    // Create a test track table using raw SQL (necessary for your app)
    const Pool = require('pg').Pool;
    const pool = new Pool({
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: dbPort,
    });

    console.log('Creating user_liked_songs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_liked_songs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        track_id INTEGER NOT NULL,
        liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, track_id)
      )
    `);

    await pool.end();
    console.log('Database initialization complete');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialized successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = {
  sequelize,
  Users,
  Songs,
  LikedSongs,
  initializeDatabase
}; 