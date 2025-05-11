const axios = require('axios');
const Users = require('../models/users');
const natural = require('natural');
require('dotenv').config();

class GeneralChatbotService {
  constructor() {
    this.config = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      MAX_HISTORY_LENGTH: parseInt(process.env.MAX_HISTORY_LENGTH || '20')
    };
    
    if (!this.config.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
    }
    
    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.sentiment = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    
    // Common words to filter out
    this.stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
    ]);
  }

  async processMessage(message, user) {
    try {
      let chatHistory = user.chatHistory || [];
      
      // Add a system prompt to encourage concise, summarized answers
      const messages = [
        {
          role: "system",
          content: `You are a helpful, concise AI assistant. Always provide answers that are summarized, to the point, and easy to read. Avoid unnecessary details and keep responses brief unless the user asks for more information.`
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
          chatHistory: user.chatHistory,
          nlpInsights: {
            sentiment,
            keywords,
            intent
          }
        };
      } catch (error) {
        console.error('OpenRouter API Error:', error.response?.data || error);
        return this.getMockResponse(message, sentiment, keywords, intent, chatHistory);
      }
    } catch (error) {
      console.error('Error in general chatbot service:', error);
      return this.getMockResponse(message, 'neutral', [], 'general', user.chatHistory || []);
    }
  }

  getMockResponse(message, sentiment, keywords, intent, chatHistory) {
    let response;
    
    // Handle different intents
    switch (intent) {
      case 'weather':
        response = "I'm sorry, I don't have access to real-time weather data. However, I can help you with other tasks or engage in conversation!";
        break;
      case 'actor':
        response = "That's a subjective question! Some of the most acclaimed actors include Meryl Streep, Daniel Day-Lewis, and Denzel Washington. However, the 'best' actor is often a matter of personal preference and the specific roles they've played. Who are some of your favorite actors?";
        break;
      case 'movie':
        response = "Movies are a great topic! There are so many amazing films across different genres. Are you looking for recommendations in a particular genre, or would you like to discuss specific movies?";
        break;
      case 'question':
        response = "That's an interesting question! While I can't provide real-time information, I'd be happy to discuss this topic with you or help you with other tasks.";
        break;
      case 'gratitude':
        response = "You're welcome! I'm here to help. Is there anything else you'd like to talk about?";
        break;
      case 'help':
        response = "I'm here to help! I can assist you with various tasks, answer questions, or just chat. What would you like to do?";
        break;
      case 'farewell':
        response = "Goodbye! Feel free to come back anytime you need assistance.";
        break;
      default:
        if (keywords.length > 0) {
          response = `I understand you're interested in ${keywords.join(', ')}. I'd be happy to discuss this with you or help you with other tasks. What would you like to know?`;
        } else {
          response = "I'd be happy to chat with you about various topics. What interests you?";
        }
    }

    return {
      message: response,
      chatHistory: chatHistory,
      nlpInsights: {
        sentiment,
        keywords,
        intent
      }
    };
  }

  analyzeSentiment(message) {
    const tokens = this.tokenizer.tokenize(message);
    const score = this.sentiment.getSentiment(tokens);
    
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  extractKeywords(message) {
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    const filteredTokens = tokens.filter(token => !this.stopWords.has(token));
    
    this.tfidf.addDocument(filteredTokens);
    
    const keywords = [];
    this.tfidf.listTerms(0).forEach(item => {
      if (item.tfidf > 0.3 && !this.stopWords.has(item.term)) {
        keywords.push(item.term);
      }
    });
    
    return keywords.slice(0, 5); // Return top 5 keywords
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('forecast')) {
      return 'weather';
    } else if (lowerMessage.includes('actor') || lowerMessage.includes('actress') || lowerMessage.includes('movie star')) {
      return 'actor';
    } else if (lowerMessage.includes('movie') || lowerMessage.includes('film') || lowerMessage.includes('cinema')) {
      return 'movie';
    } else if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('why') || lowerMessage.includes('who') || lowerMessage.includes('when') || lowerMessage.includes('where')) {
      return 'question';
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return 'gratitude';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
      return 'help';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return 'farewell';
    }
    
    return 'general';
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

module.exports = new GeneralChatbotService(); 