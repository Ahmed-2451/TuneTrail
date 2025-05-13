require('dotenv').config();
const sequelize = require('./config/db');
const Users = require('./models/users');

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
    
    console.log('Database setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during database sync:', error);
    process.exit(1);
  }
}

forceSyncTables(); 