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
          content: `You are a specialized music recommendation assistant for a Spotify clone. Your expertise is in music recommendations, playlist creation, and music-related queries. 
          
When users ask for recommendations:
1. Ask about their preferred genres, artists, or mood
2. Suggest specific songs and artists based on their preferences
3. Explain why you're recommending each song
4. Offer to create a playlist based on the recommendations

When users ask about playlists:
1. Help them create themed playlists
2. Suggest songs that would fit well together
3. Consider the mood, genre, and era of the songs

When users ask about features:
1. Explain how to use the Spotify clone features
2. Provide step-by-step instructions
3. Give examples of how to use each feature

Always be enthusiastic about music and maintain a friendly, helpful tone.`
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
            messages: messages
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
        message: "I'd be happy to recommend some music! To help me give you the best recommendations, could you tell me:\n1. What genres do you enjoy?\n2. Who are some of your favorite artists?\n3. What mood are you looking for?",
        chatHistory: chatHistory
      };
    } else if (lowerMessage.includes('playlist')) {
      return {
        message: "I can help you create a playlist! Would you like to create a playlist based on:\n1. A specific genre\n2. A particular mood\n3. Your favorite artists\n4. A specific theme or occasion",
        chatHistory: chatHistory
      };
    } else if (lowerMessage.includes('feature') || lowerMessage.includes('how to')) {
      return {
        message: "I can help you with using our features! Here are some things I can help you with:\n1. Creating and managing playlists\n2. Finding new music\n3. Using the search function\n4. Managing your profile\nWhat would you like to know more about?",
        chatHistory: chatHistory
      };
    } else {
      return {
        message: "I'm your music assistant! I can help you with:\n1. Music recommendations\n2. Creating playlists\n3. Using features\n4. Finding new artists\nWhat would you like to explore?",
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