require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Database configuration from environment variables
const dbName = process.env.DB_NAME || 'spotify';
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
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
    
    // Check if admin user exists
    const adminExists = await Users.findOne({
      where: { email: 'admin@spotify.com' }
    });
    
    // Create admin user only if it doesn't exist
    if (!adminExists) {
      console.log('Creating admin user...');
      await Users.create({
        username: 'admin',
        email: 'admin@spotify.com',
        password: 'admin123',
        name: 'Admin User',
        isAdmin: true
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
    
    // Create a test track table using raw SQL (necessary for your app)
    const Pool = require('pg').Pool;
    const pool = new Pool({
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: dbPort,
    });

    console.log('Creating tracks table...');
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
    
    // Add sample tracks
    const { rows } = await pool.query('SELECT * FROM tracks');
    if (rows.length === 0) {
      console.log('Adding sample tracks...');
      await pool.query(`
        INSERT INTO tracks (title, artist, filename, album, cover_url)
        VALUES 
        ('K.', 'Cigarettes After Sex', 'K. - Cigarettes After Sex.mp3', 'K.', '/images/image.jpg'),
        ('Cry', 'Cigarettes After Sex', 'Cry - Cigarettes After Sex.mp3', 'Cry', '/images/image.jpg'),
        ('Apocalypse', 'Cigarettes After Sex', 'Apocalypse - Cigarettes After Sex.mp3', 'Apocalypse', '/images/image.jpg')
      `);
      console.log('Sample tracks added');
    }

    // List all created tables
    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('Created tables:', results.map(r => r.table_name).join(', '));
    
    console.log('Database initialization complete');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('Database setup successful');
        process.exit(0);
      } else {
        console.error('Database setup failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error during database setup:', err);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = { 
    initializeDatabase,
    sequelize,
    Users,
    Songs,
    LikedSongs
  };
} 