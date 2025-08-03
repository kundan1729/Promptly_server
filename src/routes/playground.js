const express = require('express');
const router = express.Router();
const { saveHistory, saveCollection, getUserCollection, getGroqFeedback, patternizePrompt } = require('../controllers/playgroundController');
// Patternize Prompt AI Action
router.post('/prompt/ai-action', patternizePrompt);
// Groq patternize endpoint for improved prompt only
router.post('/groq/patternize', patternizePrompt);
// Groq AI feedback endpoint
router.post('/groq/feedback', getGroqFeedback);

// Save feedback/patternize history
router.post('/history', saveHistory);

// Save patternized prompt to collection
router.post('/collection', saveCollection);

// Get user's saved collection
router.get('/collection/:userId', getUserCollection);

module.exports = router;
