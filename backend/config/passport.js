const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const Users = require('../models/users');
require('dotenv').config();

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'spotify_clone_secret_key_2024'
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

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
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

module.exports = passport; 