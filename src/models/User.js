
// Import mongoose for MongoDB object modeling
const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Remove whitespace
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email is unique
    lowercase: true, // Store email in lowercase
    trim: true,
  },
  password: {
    type: String,
    required: true, // Hashed password
  },
  resetToken: String, // Token for password reset
  resetTokenExpiry: Date, // Expiry for reset token
}, { timestamps: true }); // Add createdAt and updatedAt fields

// Export the User model
module.exports = mongoose.model('User', userSchema);
