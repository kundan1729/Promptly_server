
// Import core modules and third-party libraries
const express = require('express'); // Express web framework
const cors = require('cors'); // CORS for cross-origin requests
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting
const path = require('path'); // Path utilities
require('dotenv').config(); // Load environment variables
const session = require('express-session'); // Session management
const passport = require('passport'); // Authentication middleware

// Import Passport strategies for OAuth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Import routers
const enhanceRouter = require('./routes/enhance');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;


// Apply security-related middleware
app.use(helmet()); // Set secure HTTP headers

// Apply rate limiting to API routes to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Configure CORS to allow requests from frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || false 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Parse incoming JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure session management for authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-very-secure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevent client-side JS access
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax' // CSRF protection
  }
}));
app.use(passport.initialize()); // Initialize Passport
app.use(passport.session()); // Enable session support

// Configure Passport Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    // Find or create the user in your DB (custom logic can be added here)
    return done(null, profile); // Pass user profile to next step
  }
));

// Configure Passport GitHub OAuth strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback'
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


// Mount API routes
app.use('/api/enhance', enhanceRouter); // Prompt enhancement API
const playgroundRouter = require('./routes/playground');
app.use('/api', playgroundRouter); // History & collection endpoints

// Mount authentication routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter); // Auth API (register, login, forgot, reset)

// GitHub OAuth endpoints
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect to frontend after successful login
    res.redirect(`${process.env.FRONTEND_URL}/playground`);

  }
);

// Google OAuth endpoints
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect to frontend after successful login
    res.redirect(`${process.env.FRONTEND_URL}/playground`);

  }
);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
