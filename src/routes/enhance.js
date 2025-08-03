
// Import Express and OpenAI client
const express = require('express');
const { OpenAI } = require('openai');

const router = express.Router();

// Initialize OpenAI client for Groq API
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Middleware to validate incoming enhancement requests
const validateRequest = (req, res, next) => {
  const { prompt, rules } = req.body;
  // Validate prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Valid prompt is required' });
  }
  if (prompt.length > 5000) {
    return res.status(400).json({ error: 'Prompt too long (max 5000 characters)' });
  }
  // Validate rules object
  if (!rules || typeof rules !== 'object') {
    return res.status(400).json({ error: 'Rules object is required' });
  }
  next();
};

// Helper to build the system prompt for enhancement
const buildEnhancementPrompt = (originalPrompt, rules) => {
  const hasSpecificity = rules.specificity;
  const hasContext = rules.context;
  const hasGrammar = rules.grammar;
  const applyAll = !hasSpecificity && !hasContext && !hasGrammar;
  let systemPrompt = `You are a prompt enhancement expert. Your task is to improve the given prompt by`;
  const improvements = [];
  if (applyAll || hasSpecificity) improvements.push('making it more specific and detailed');
  if (applyAll || hasContext) improvements.push('adding relevant context and background information');
  if (applyAll || hasGrammar) improvements.push('improving grammar, clarity, and structure');
  systemPrompt += ` ${improvements.join(', ')}.`;
  systemPrompt += `\nReturn ONLY a single line of valid JSON with the key \"enhanced\" containing the improved prompt.\nDo NOT include any explanation, markdown, or extra text.\nExample: {\"enhanced\": \"Your enhanced prompt here\"}\n`;
  return {
    systemPrompt,
    userPrompt: `Please enhance this prompt: \"${originalPrompt}\"`
  };
};

// POST /api/enhance: Enhance prompt using Groq API
router.post('/', validateRequest, async (req, res) => {
  try {
    const { prompt, rules } = req.body;
    // Ensure Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }
    const { systemPrompt, userPrompt } = buildEnhancementPrompt(prompt, rules);
    
    // Call Groq (OpenAI-compatible) API
    const completion = await openai.chat.completions.create({
      model: 'llama3-70b-8192', // or another Groq-supported model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return res.status(500).json({ error: 'No response from Groq' });
    }
    
    // Try to parse JSON response
    let enhancedPrompt;
    try {
      const jsonResponse = JSON.parse(response);
      enhancedPrompt = jsonResponse.enhanced;
    } catch (parseError) {
      // Fallback: use the raw response if JSON parsing fails
      console.warn('Failed to parse JSON response, using raw response:', parseError.message);
      enhancedPrompt = response;
    }
    
    if (!enhancedPrompt || typeof enhancedPrompt !== 'string') {
      return res.status(500).json({ error: 'Invalid response format from Groq' });
    }
    
    // Return enhanced prompt to client
    res.json({ enhanced: enhancedPrompt.trim() });
    
  } catch (error) {
    // Handle errors from Groq API
    console.error('Groq API error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance prompt', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});
module.exports = router;
