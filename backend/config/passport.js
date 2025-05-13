const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const Users = require('../models/users');
require('dotenv').config();

// Verify required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  throw new Error('JWT_SECRET is not configured');
}

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    const user = await Users.findByPk(jwtPayload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Set production Google callback URL if in production mode and not explicitly configured
if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CALLBACK_URL) {
  process.env.GOOGLE_CALLBACK_URL = 'https://spotify-clone.onrender.com/api/auth/google/callback';
  console.log(`Production detected, setting GOOGLE_CALLBACK_URL to: ${process.env.GOOGLE_CALLBACK_URL}`);
}

// Google OAuth Strategy - only set up if environment variables are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  console.log(`Using Google callback URL: ${process.env.GOOGLE_CALLBACK_URL}`);
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    prompt: 'select_account'  // Force account selection
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await Users.findOne({ where: { email: profile.emails[0].value } });
      
      if (user) {
        return done(null, user);
      }
      
      // If not, create a new user
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      
      user = await Users.create({
        username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
        email: profile.emails[0].value,
        password: hashedPassword,
        name: profile.displayName,
        profileImage: profile.photos[0].value || 'defaultpfp.jpg'
      });
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
} else {
  console.warn('Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in your .env file to enable it.');
}

module.exports = passport; 