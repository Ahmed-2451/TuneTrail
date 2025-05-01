const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration from environment variables
const dbName = process.env.DB_NAME || 'spotify';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: 'postgres',
  port: dbPort,
  logging: false,
});

sequelize.authenticate()
  .then(() => console.log(`Connected to PostgreSQL at ${dbHost}:${dbPort}`))
  .catch(err => console.error("Sequelize connection error:", err));

module.exports = sequelize;