const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  userId: { type: String, required: false },
  prompt: { type: String, required: true },
  patternized: { type: String, required: true },
  pattern: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collection', CollectionSchema);
