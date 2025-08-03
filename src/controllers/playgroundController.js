// Patternize Prompt AI Action (mock implementation)
exports.patternizePrompt = async (req, res) => {
  try {
    const { prompt, pattern } = req.body;
    const axios = require('axios');
    const groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }
    // Compose prompt for Groq: only return improved prompt
    const userPrompt = `You are an expert prompt engineer. Rewrite the following prompt to be clearer, more complete, and better aligned with the "${pattern}" pattern. Only return the improved prompt, nothing else.\n\nPrompt:\n${prompt}`;
    const payload = {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    };
    const aiRes = await axios.post(groqApiUrl, payload, { headers });
    const improvedPrompt = aiRes.data.choices?.[0]?.message?.content?.trim() || 'No response from Groq.';
    res.json({ result: improvedPrompt });
  } catch (err) {
    console.error('Groq API error (patternizePrompt):', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to patternize prompt.' });
  }
};
// Groq AI feedback endpoint (mock implementation)
exports.getGroqFeedback = async (req, res) => {
  try {
    const { prompt, pattern } = req.body;
    const axios = require('axios');
    const groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }
    // Compose prompt for Groq with strict format
    const systemPrompt = `You are an expert in prompt engineering. Analyze the following prompt and respond in the following strict format:\n\nFeedback: <one paragraph>\nSuggestions: <bullet list, each starting with '- '>\nRating: <single integer out of 10>\n\nDo not use markdown, do not add extra sections, do not add explanations.\n\nPrompt:\n"${prompt}"\nPattern: ${pattern}`;
    const payload = {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    };
    const aiRes = await axios.post(groqApiUrl, payload, { headers });
    const aiText = aiRes.data.choices?.[0]?.message?.content || 'No response from Groq.';
    res.json({ result: aiText });
  } catch (err) {
    console.error('Groq API error (getGroqFeedback):', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to get feedback.' });
  }
};
const History = require('../models/History');
const Collection = require('../models/Collection');

// Save feedback/patternize history
exports.saveHistory = async (req, res) => {
  try {
    const { userId, prompt, feedback, patternized, pattern } = req.body;
    const entry = new History({ userId, prompt, feedback, patternized, pattern, createdAt: new Date() });
    await entry.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save history.' });
  }
};

// Save patternized prompt to collection
exports.saveCollection = async (req, res) => {
  try {
    const { userId, prompt, patternized, pattern } = req.body;
    const entry = new Collection({ userId, prompt, patternized, pattern, createdAt: new Date() });
    await entry.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save to collection.' });
  }
};

// Get user's saved collection
exports.getUserCollection = async (req, res) => {
  try {
    const { userId } = req.params;
    const items = await Collection.find({ userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collection.' });
  }
};
