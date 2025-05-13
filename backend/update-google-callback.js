// Script to update Google OAuth callback URL for production
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Set the production URL with your Render app name
const PRODUCTION_CALLBACK_URL = 'https://spotify-clone.onrender.com/api/auth/google/callback';

console.log('Updating Google OAuth callback URL for production environment...');
console.log(`Set the following URL in Google Cloud Console: ${PRODUCTION_CALLBACK_URL}`);

// Update the environment variable
process.env.GOOGLE_CALLBACK_URL = PRODUCTION_CALLBACK_URL;

console.log(`Google OAuth callback URL set to: ${PRODUCTION_CALLBACK_URL}`);
console.log('This URL must match what you have configured in the Google Cloud Console.');
console.log('Remember to add this environment variable in your Render dashboard.');

// Instructions for manual setup in Render
console.log('\nTo manually configure in Render:');
console.log('1. Go to the Render dashboard');
console.log('2. Navigate to your web service');
console.log('3. Go to Environment tab');
console.log('4. Add GOOGLE_CALLBACK_URL with value:');
console.log(`   ${PRODUCTION_CALLBACK_URL}`); 