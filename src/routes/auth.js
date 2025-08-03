
// Import Express and Passport for authentication
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

// Configure Passport Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // Find or create the user in your DB (custom logic can be added here)
    return done(null, profile); // Pass user profile to next step
  }
));

// Serialize user info into session
passport.serializeUser((user, done) => done(null, user));
// Deserialize user info from session
passport.deserializeUser((obj, done) => done(null, obj));

// Import authentication controller
const authController = require('../controllers/authController');

// Email/password authentication routes
router.post('/register', authController.register); // Register new user
router.post('/login', authController.login); // Login user
router.post('/forgot', authController.forgot); // Forgot password
router.post('/reset/:token', authController.reset); // Reset password

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect to frontend after successful login
    res.redirect('http://localhost:5173/playground');
  }
);

// Route to provide user info from session (for OAuth)
router.get('/user', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    // Extract name and email from Google/GitHub profile object
    const profile = req.user;
    let name = profile.displayName || profile.username || profile.name || '';
    let email = (profile.emails && profile.emails[0] && profile.emails[0].value) || '';
    res.json({ name, email });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Export the router
module.exports = router;
