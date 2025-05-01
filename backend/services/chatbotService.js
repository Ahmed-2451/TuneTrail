const fetch = require('node-fetch');
const Users = require('../models/users');
const fallbackService = require('./fallbackChatbotService');

// Configuration options - can be moved to environment variables
const config = {
  // Astra DB Langflow API Configuration
  ASTRA_API_URL: process.env.ASTRA_API_URL || 'https://api.langflow.astra.datastax.com/lf/30d958ec-060d-462e-8a6b-add816d19be6/api/v1/run/681fbcd2-90db-4616-b22b-602e588284f1',
  ASTRA_TOKEN: process.env.ASTRA_TOKEN || 'AstraCS:uNaZRDvGGjvvqhAmdSXsPbTp:27711d60c263bd7b2daad948eb7cbcdc2dbc253ad9ada899187acad2da29d696',
  
  // Controls whether to use the Astra API or fallback service
  USE_FALLBACK: process.env.USE_FALLBACK === 'false' ? false : true,
  
  // Maximum number of chat history messages to store
  MAX_HISTORY_LENGTH: 20
};

/**
 * Chatbot service that handles interaction with Astra DB Langflow API 
 * or falls back to the local service
 */
class ChatbotService {
  /**
   * Send a message to the chatbot API and get a response
   * @param {string} message - The user's message
   * @param {object} user - The user object
   * @returns {Promise<object>} - The response from the chatbot
   */
  async processMessage(message, user) {
    // If fallback is enabled, use the fallback service directly
    if (config.USE_FALLBACK) {
      return fallbackService.processMessage(message, user);
    }
    
    try {
      // Get user chat history or initialize if it doesn't exist
      let chatHistory = user.chatHistory || [];
      
      // Create conversation context from history
      const conversationContext = chatHistory.length > 0 
        ? chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : '';
      
      // Add system context for music assistant
      const inputWithContext = conversationContext 
        ? `${conversationContext}\nYou are a helpful music assistant for a Spotify clone. You can recommend songs, help with playlists, and answer questions about music.\nuser: ${message}`
        : `You are a helpful music assistant for a Spotify clone. You can recommend songs, help with playlists, and answer questions about music.\nuser: ${message}`;
      
      // Prepare the request to Astra Langflow API
      const response = await fetch(`${config.ASTRA_API_URL}?stream=false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ASTRA_TOKEN}`
        },
        body: JSON.stringify({
          "input_value": inputWithContext,
          "output_type": "chat",
          "input_type": "chat"
        }),
        timeout: 15000 // 15-second timeout to prevent long waits
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Astra API error:', errorData);
        // Fall back to the fallback service if API returns an error
        return fallbackService.processMessage(message, user);
      }

      const data = await response.json();
      
      // Extract the bot's response
      const botMessage = data.output || "Sorry, I couldn't process your request.";
      
      // Update chat history
      await this.updateChatHistory(user.id, message, botMessage, chatHistory);
      
      return {
        message: botMessage,
        chatHistory: user.chatHistory
      };
    } catch (error) {
      console.error('Error in chatbot service:', error);
      // Fall back to the fallback service if there's an error
      return fallbackService.processMessage(message, user);
    }
  }

  /**
   * Update the chat history for a user
   * @private
   * @param {number} userId - The user's ID
   * @param {string} userMessage - The user's message
   * @param {string} botMessage - The bot's response
   * @param {Array} currentHistory - The current chat history
   */
  async updateChatHistory(userId, userMessage, botMessage, currentHistory) {
    try {
      // Add messages to history
      let chatHistory = [...currentHistory];
      chatHistory.push({ role: "user", content: userMessage });
      chatHistory.push({ role: "assistant", content: botMessage });
      
      // Limit history to configured max length
      if (chatHistory.length > config.MAX_HISTORY_LENGTH) {
        chatHistory = chatHistory.slice(chatHistory.length - config.MAX_HISTORY_LENGTH);
      }
      
      // Ensure every message has a role
      chatHistory = chatHistory.map(msg => {
        if (!msg.role) {
          return { ...msg, role: "assistant" };
        }
        return msg;
      });
      
      // Save updated chat history to user
      await Users.update({ chatHistory }, { where: { id: userId } });
      
      return chatHistory;
    } catch (error) {
      console.error('Error updating chat history:', error);
      throw error;
    }
  }

  /**
   * Get the chat history for a user
   * @param {number} userId - The user's ID
   * @returns {Promise<Array>} - The user's chat history
   */
  async getChatHistory(userId) {
    try {
      const user = await Users.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user.chatHistory || [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Clear the chat history for a user
   * @param {number} userId - The user's ID
   * @returns {Promise<void>}
   */
  async clearChatHistory(userId) {
    try {
      await Users.update({ chatHistory: [] }, { where: { id: userId } });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }
}

module.exports = new ChatbotService(); 