require('dotenv').config();
const { spawn } = require('child_process');
const { initializeDatabase } = require('./init-db');

async function startApp() {
  console.log('🔄 Starting Spotify Clone application...');
  
  try {
    console.log('🗄️ Initializing database...');
    const success = await initializeDatabase();
    
    if (!success) {
      console.error('❌ Database initialization failed. Starting server anyway...');
    } else {
      console.log('✅ Database initialized successfully!');
    }
    
    console.log('🚀 Starting server...');
    // Use spawn to keep stdout/stderr properly piped
    const server = spawn('node', ['server.js'], { stdio: 'inherit' });
    
    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });
    
    // Handle termination signals
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        server.kill(signal);
      });
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
startApp(); 