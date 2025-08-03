
// Import required modules
const bcrypt = require('bcryptjs'); // Password hashing
const jwt = require('jsonwebtoken'); // JWT for authentication
const crypto = require('crypto'); // For secure token generation
const User = require('../models/User'); // User model
const nodemailer = require('nodemailer'); // Email sending
const mongoose = require('mongoose'); // MongoDB connection

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register a new user
exports.register = async (req, res) => {
  // Ensure DB connection
  let timeout = 25;
  while (mongoose.connection.readyState === 0) {
    if (timeout === 0) {
      console.log('timeout');
      throw new Error('timeout occured with mongoose connection');
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    timeout--;
  }
  console.log('Database connection status:', mongoose.connection.readyState);
  try {
    const { name, email, password } = req.body;
    // Validate required fields
    if (!name || !email || !password) {
      console.error('Validation error: Missing fields', req.body);
      return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
    }
    // Validate field types
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      console.error('Validation error: Invalid field types', req.body);
      return res.status(400).json({ error: 'Invalid input types.' });
    }
    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('Duplicate email registration attempt:', email);
      return res.status(400).json({ error: 'Email already in use.' });
    }
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    if (!user) {
      console.error('User creation returned null/undefined');
      return res.status(500).json({ error: 'User creation failed.' });
    }
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { name: user.name, email: user.email }, token });
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      console.error('Mongoose duplicate key error:', err.message);
      return res.status(400).json({ error: 'Email already exists.' });
    }
    // Handle validation error
    if (err.name === 'ValidationError') {
      console.error('Mongoose validation error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    // Handle MongoDB connection error
    if (err.message && err.message.includes('failed to connect')) {
      console.error('MongoDB connection error:', err.message);
      return res.status(500).json({ error: 'Database connection error.' });
    }
    // Handle other errors
    console.error('Register error:', err.stack || err.message || err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { name: user.name, email: user.email }, token });
  } catch (err) {
    // Handle server error
    res.status(500).json({ error: 'Server error' });
  }
};

exports.forgot = async (req, res) => {
  // Ensure DB connection
  let timeout = 25;
  while (mongoose.connection.readyState === 0) {
    if (timeout === 0) {
      console.log('timeout');
      throw new Error('timeout occured with mongoose connection');
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    timeout--;
  }
  console.log('Database connection status:', mongoose.connection.readyState);
  try {
    const { email } = req.body;
    // Validate email
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    // Generate secure reset token and expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    // Build password reset URL
    const resetUrl = `${CLIENT_URL}/reset/${resetToken}`;
    // Send password reset email
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
    });
    // Respond to client
    res.json({ message: 'Password reset link sent' });
  } catch (err) {
    // Handle server error
    res.status(500).json({ error: 'Server error' });
  }
};

exports.reset = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    // Validate password
    if (!password) return res.status(400).json({ error: 'Password is required' });
    // Find user by reset token and check expiry
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    // Hash new password and update user
    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    // Respond to client
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    // Handle server error
    res.status(500).json({ error: 'Server error' });
  }
};
