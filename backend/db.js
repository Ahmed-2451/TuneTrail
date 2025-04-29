const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('spotify', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432,
  logging: false, 
});


sequelize.authenticate()
  .then(() => console.log("Connected to PostgreSQL!"))
  .catch(err => console.error("Sequelize connection error:", err));

module.exports = sequelize;