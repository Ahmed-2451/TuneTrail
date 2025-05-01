const express = require('express');
const router = express.Router();
const passport = require('passport');
const chatbotService = require('../services/chatbotService');

// Middleware to ensure user is authenticated
const authenticate = passport.authenticate('jwt', { session: false });

/**
 * Send a message to the chatbot and get a response
 * POST /api/chatbot/message
 * Requires authentication
 */
router.post('/message', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Verify we have a user object
    if (!req.user || !req.user.id) {
      console.error('User authentication issue - missing user data in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`Processing message from user ${req.user.id}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    const response = await chatbotService.processMessage(message, req.user);
    
    res.json(response);
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    res.status(500).json({ error: 'Failed to process message', message: error.message });
  }
});


router.get('/history', authenticate, async (req, res) => {
  try {
    // Verify we have a user object
    if (!req.user || !req.user.id) {
      console.error('User authentication issue - missing user data in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const chatHistory = await chatbotService.getChatHistory(req.user.id);
    
    res.json({ chatHistory });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history', message: error.message });
  }
});


router.get('/export', authenticate, async (req, res) => {
  try {
    // Verify we have a user object
    if (!req.user || !req.user.id) {
      console.error('User authentication issue - missing user data in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const chatHistory = await chatbotService.getChatHistory(req.user.id);
    
    // Format the chat history for better readability
    const formattedHistory = chatHistory.map((msg, index) => ({
      id: index + 1,
      role: msg.role || 'assistant',
      content: msg.content,
      timestamp: new Date().toISOString() // Note: Using current timestamp as example
    }));
    
    // Prepare file content
    const exportData = {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      },
      exportDate: new Date().toISOString(),
      chatHistory: formattedHistory
    };
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=spotify-assistant-chat-history.json');
    res.setHeader('Content-Type', 'application/json');
    
    // Send the formatted JSON
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting chat history:', error);
    res.status(500).json({ error: 'Failed to export chat history', message: error.message });
  }
});


router.delete('/history', authenticate, async (req, res) => {
  try {
    // Verify we have a user object
    if (!req.user || !req.user.id) {
      console.error('User authentication issue - missing user data in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    await chatbotService.clearChatHistory(req.user.id);
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history', message: error.message });
  }
});

module.exports = router;