const express = require('express');
const router = express.Router();
const passport = require('passport');
const musicChatbotService = require('../services/musicChatbotService');
const generalChatbotService = require('../services/generalChatbotService');
const { authenticateJWT } = require('../middleware/auth');

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

/**
 * Send a message to the music chatbot and get a response
 * POST /api/chatbot/music/message
 * Requires authentication
 */
router.post('/music/message', authenticateJWT, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Processing music message from user ${user.id}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    const response = await musicChatbotService.processMessage(message, user);
    
    res.json(response);
  } catch (error) {
    console.error('Error in music chatbot route:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Send a message to the general chatbot and get a response
 * POST /api/chatbot/general/message
 * Requires authentication
 */
router.post('/general/message', authenticateJWT, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Processing general message from user ${user.id}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    const response = await generalChatbotService.processMessage(message, user);
    
    res.json(response);
  } catch (error) {
    console.error('Error in general chatbot route:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Get chat history for music chatbot
 * GET /api/chatbot/music/history
 * Requires authentication
 */
router.get('/music/history', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    const chatHistory = await musicChatbotService.getChatHistory(user.id);
    
    res.json({ chatHistory });
  } catch (error) {
    console.error('Error getting music chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

/**
 * Get chat history for general chatbot
 * GET /api/chatbot/general/history
 * Requires authentication
 */
router.get('/general/history', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    const chatHistory = await generalChatbotService.getChatHistory(user.id);
    
    res.json({ chatHistory });
  } catch (error) {
    console.error('Error getting general chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

/**
 * Clear chat history for music chatbot
 * DELETE /api/chatbot/music/history
 * Requires authentication
 */
router.delete('/music/history', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    await musicChatbotService.clearChatHistory(user.id);
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing music chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

/**
 * Clear chat history for general chatbot
 * DELETE /api/chatbot/general/history
 * Requires authentication
 */
router.delete('/general/history', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    await generalChatbotService.clearChatHistory(user.id);
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing general chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

module.exports = router;