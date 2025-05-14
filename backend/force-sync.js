require('dotenv').config();
const sequelize = require('./config/db');
const Users = require('./models/users');
const { Pool } = require('pg');
// Import any other models here if needed
// const Songs = require('./models/songs');
// const LikedSong = require('./models/likedsong');

async function forceSyncTables() {
  try {
    console.log('Starting database force sync...');
    // Force: true will drop and recreate tables
    await sequelize.sync({ force: true });
    console.log('All tables have been created successfully');
    
    // Create admin account
    console.log('Creating admin account...');
    await Users.create({
      username: 'admin',
      email: 'admin@spotify.com',
      password: 'admin123',
      name: 'Admin User',
      isAdmin: true
    });
    console.log('Admin account created successfully');
    
    // Create tracks table
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'spotify',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

    console.log('Creating tracks table...');
    await pool.query(`
      DROP TABLE IF EXISTS tracks;
      CREATE TABLE tracks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        album VARCHAR(255) NOT NULL,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cover_url VARCHAR(255)
      )
    `);
    
    console.log('Adding tracks to database...');
    await pool.query(`
      INSERT INTO tracks (title, artist, filename, album, cover_url)
      VALUES 
      ('K.', 'Cigarettes After Sex', 'K. - Cigarettes After Sex.mp3', 'K.', '/images/image.jpg'),
      ('Cry', 'Cigarettes After Sex', 'Cry - Cigarettes After Sex.mp3', 'Cry', '/images/image.jpg'),
      ('Apocalypse', 'Cigarettes After Sex', 'Apocalypse - Cigarettes After Sex.mp3', 'Apocalypse', '/images/image.jpg'),
      ('Flash', 'Cigarettes After Sex', 'Flash.mp3', 'Flash', '/images/image.jpg'),
      ('Opera House', 'Cigarettes After Sex', 'Opera House.mp3', 'Opera House', '/images/image.jpg'),
      ('John Wayne', 'Cigarettes After Sex', 'John Wayne.mp3', 'John Wayne', '/images/image.jpg'),
      ('Sweet', 'Cigarettes After Sex', 'Sweet.mp3', 'Sweet', '/images/image.jpg'),
      ('Each Time You Fall in Love', 'Cigarettes After Sex', 'Each Time You Fall in Love.mp3', 'Each Time You Fall in Love', '/images/image.jpg')
    `);
    console.log('Tracks added successfully');
    
    // Log tables created
    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('Tables created:', results.map(r => r.table_name).join(', '));
    
    console.log('Database setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during database sync:', error);
    process.exit(1);
  }
}

forceSyncTables(); 