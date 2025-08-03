const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: { type: String, required: false },
  prompt: { type: String, required: true },
  feedback: { type: mongoose.Schema.Types.Mixed },
  patternized: { type: mongoose.Schema.Types.Mixed },
  pattern: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', HistorySchema);
