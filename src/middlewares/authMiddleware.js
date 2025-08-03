
// JWT authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token and attach user to request
module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  // Check for Bearer token in Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Verify token and decode payload
    const decoded = jwt.verify(token, JWT_SECRET);
    // Find user by decoded ID, exclude password field
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user; // Attach user to request
    next(); // Proceed to next middleware/route
  } catch (err) {
    // Invalid token
    res.status(401).json({ error: 'Invalid token' });
  }
};
