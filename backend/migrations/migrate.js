require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tunetrail',
    password: process.env.DB_PASSWORD || 'postgres', 
    port: process.env.DB_PORT || 5432,
});

async function createMigrationsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await pool.query(query);
}

async function getExecutedMigrations() {
    try {
        const result = await pool.query('SELECT filename FROM migrations ORDER BY executed_at');
        return result.rows.map(row => row.filename);
    } catch (error) {
        return [];
    }
}

async function executeMigration(filename) {
    const migrationPath = path.join(__dirname, filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Executing migration: ${filename}`);
    
    try {
        await pool.query(migrationSQL);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        console.log(`✅ Migration ${filename} executed successfully`);
    } catch (error) {
        console.error(`❌ Migration ${filename} failed:`, error.message);
        throw error;
    }
}

async function runMigrations() {
    try {
        console.log('Starting database migrations...');
        
        // Create migrations table if it doesn't exist
        await createMigrationsTable();
        
        // Get list of executed migrations
        const executedMigrations = await getExecutedMigrations();
        
        // Get all migration files
        const migrationFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        // Execute pending migrations
        const pendingMigrations = migrationFiles.filter(
            file => !executedMigrations.includes(file)
        );
        
        if (pendingMigrations.length === 0) {
            console.log('✅ No pending migrations');
            return;
        }
        
        console.log(`Found ${pendingMigrations.length} pending migrations`);
        
        for (const migration of pendingMigrations) {
            await executeMigration(migration);
        }
        
        console.log('✅ All migrations completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations }; 