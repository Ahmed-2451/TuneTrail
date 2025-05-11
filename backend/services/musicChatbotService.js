const axios = require('axios');
const Users = require('../models/users');
require('dotenv').config();

class MusicChatbotService {
  constructor() {
    this.config = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      MAX_HISTORY_LENGTH: parseInt(process.env.MAX_HISTORY_LENGTH || '20')
    };
  }

  async processMessage(message, user) {
    try {
      let chatHistory = user.chatHistory || [];
      
      // Construct conversation history for context
      const messages = [
        {
          role: "system",
          content: `Music recommendation assistant. Extremely summarized responses only. Maximum 2 sentences. No unnecessary words. Skip all greetings and pleasantries. For recommendations, just name 1-2 songs or artists with minimal explanation. For feature instructions, use bullet points with 3 or fewer steps.`
        }
      ];

      // Add previous conversation context
      if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: message
      });

      try {
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "mistralai/mistral-7b-instruct",
            messages: messages,
            temperature: 0.3  // Lower temperature for more concise responses
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        const botMessage = response.data.choices[0].message.content;
        await this.updateChatHistory(user.id, message, botMessage, chatHistory);

        return {
          message: botMessage,
          chatHistory: user.chatHistory
        };
      } catch (error) {
        console.error('OpenRouter API Error:', error.response?.data || error);
        return this.getMockResponse(message, chatHistory);
      }
    } catch (error) {
      console.error('Error in music chatbot service:', error);
      return this.getMockResponse(message, user.chatHistory || []);
    }
  }

  getMockResponse(message, chatHistory) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion')) {
      return {
        message: "What genres or artists do you like?",
        chatHistory: chatHistory
      };
    } else if (lowerMessage.includes('playlist')) {
      return {
        message: "Theme preference: genre, mood, artist, or occasion?",
        chatHistory: chatHistory
      };
    } else if (lowerMessage.includes('feature') || lowerMessage.includes('how to')) {
      return {
        message: "Which feature? Playlists, search, or profile management?",
        chatHistory: chatHistory
      };
    } else {
      return {
        message: "Ask about recommendations, playlists, or features.",
        chatHistory: chatHistory
      };
    }
  }

  async updateChatHistory(userId, userMessage, botMessage, currentHistory) {
    try {
      let chatHistory = [...currentHistory];
      chatHistory.push({ role: "user", content: userMessage });
      chatHistory.push({ role: "assistant", content: botMessage });
      
      if (chatHistory.length > this.config.MAX_HISTORY_LENGTH) {
        chatHistory = chatHistory.slice(chatHistory.length - this.config.MAX_HISTORY_LENGTH);
      }
      
      await Users.update({ chatHistory }, { where: { id: userId } });
      
      return chatHistory;
    } catch (error) {
      console.error('Error updating chat history:', error);
      throw error;
    }
  }

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

  async clearChatHistory(userId) {
    try {
      await Users.update({ chatHistory: [] }, { where: { id: userId } });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }
}

module.exports = new MusicChatbotService(); 