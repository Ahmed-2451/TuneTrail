const axios = require('axios');
const Users = require('../models/users');
const natural = require('natural');
require('dotenv').config();

class GeneralChatbotService {
  constructor() {
    this.config = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      MAX_HISTORY_LENGTH: parseInt(process.env.MAX_HISTORY_LENGTH || '20'),
      GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY,
      GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID
    };
    
    this.models = {
      primary: "openai/gpt-3.5-turbo",            // Free tier on OpenRouter, very reliable
      advanced: "openai/gpt-3.5-turbo",            // Using same model for consistency
      fallback: "google/gemini-pro"                // Alternative free option if OpenAI has issues
    };
    
    if (!this.config.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
    }
    
    if (!this.config.GOOGLE_SEARCH_API_KEY || !this.config.GOOGLE_SEARCH_ENGINE_ID) {
      console.warn('Google Search API configuration is missing. Web search capabilities will be disabled.');
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

  /**
   * Check if a message requires real-time information
   * @param {string} message - User's message
   * @returns {boolean} - Whether the message likely needs current info
   */
  needsRealTimeInfo(message) {
    const lowercaseMessage = message.toLowerCase();
    
    // Keywords that suggest need for current information
    const realTimeKeywords = [
      'latest', 'current', 'recent', 'today', 'yesterday', 'this week',
      'this month', 'this year', 'now', 'happening', 'news', 'update',
      'score', 'weather', 'price', 'stock', 'election', 'president',
      'prime minister', 'covid', 'pandemic', 'who is', 'what is', 'when is',
      'latest', 'newest', 'trending', 'viral', 'release date',
      'stock price', 'market', 'box office', 'album', 'single',
      'football', 'baseball', 'basketball', 'soccer', 'cricket', 'tennis',
      'tournament', 'championship', 'world cup', 'olympics', 'series'
    ];
    
    return realTimeKeywords.some(keyword => lowercaseMessage.includes(keyword));
  }

  /**
   * Perform a web search using Google Custom Search API
   * @param {string} query - Search query
   * @returns {Promise<string>} - Search results in a concise format
   */
  async searchWeb(query) {
    if (!this.config.GOOGLE_SEARCH_API_KEY || !this.config.GOOGLE_SEARCH_ENGINE_ID) {
      console.warn('Web search failed: API keys not configured');
      return "Web search capability is not configured.";
    }
    
    try {
      console.log(`Performing web search for: ${query}`);
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.config.GOOGLE_SEARCH_API_KEY}&cx=${this.config.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
      
      console.log(`Sending request to Google Custom Search API...`);
      const response = await axios.get(url);
      console.log(`Search API response status: ${response.status}`);
      
      if (!response.data.items || response.data.items.length === 0) {
        console.log('Search completed but returned no results');
        return "No relevant search results found.";
      }
      
      // Format the top search results
      const searchResults = response.data.items.slice(0, 3).map(item => {
        return {
          title: item.title,
          snippet: item.snippet
          // Removed the link to prevent the model from citing sources
        };
      });
      
      // Format search results as text, but without source links
      let formattedResults = "Here is relevant information (do not cite or mention these in your answer):\n\n";
      searchResults.forEach((result, index) => {
        formattedResults += `${result.title}\n${result.snippet}\n\n`;
      });
      
      console.log('Web search completed successfully');
      return formattedResults;
    } catch (error) {
      console.error('Web search error:', error.message);
      
      // Enhanced error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Search API error response data:', error.response.data);
        console.error('Search API error response status:', error.response.status);
        console.error('Search API error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from search API:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Search request setup error:', error.message);
      }
      
      // Return a more specific error message
      return "Failed to perform web search. Trying to answer based on existing knowledge.";
    }
  }

  async processMessage(message, user) {
    try {
      // Validate API key first
      if (!this.config.OPENROUTER_API_KEY) {
        console.error('OpenRouter API Key is not configured');
        return {
          message: "The AI service is not properly configured. Please add an OpenRouter API key to your .env file.",
          chatHistory: user.chatHistory || [],
          error: "API_KEY_MISSING"
        };
      }

      let chatHistory = user.chatHistory || [];
      
      // Only include the last messages to reduce payload size
      const recentHistory = chatHistory.slice(-10);
      
      // Check if the message likely needs real-time information
      const needsCurrentInfo = this.needsRealTimeInfo(message);
      let webSearchResults = "";
      let webSearchFailed = false;

      // Perform web search if needed
      if (needsCurrentInfo && this.config.GOOGLE_SEARCH_API_KEY && this.config.GOOGLE_SEARCH_ENGINE_ID) {
        console.log('Message likely needs real-time information. Performing web search...');
        webSearchResults = await this.searchWeb(message);
        
        // Check if the search failed
        if (webSearchResults.includes("Failed to perform web search")) {
          console.log('Web search failed, proceeding with general knowledge response');
          webSearchFailed = true;
          webSearchResults = ""; // Don't include error message in query to OpenRouter
        }
      }
      
      // Updated system prompt with extremely strict instructions against citing sources
      let systemPrompt = webSearchResults 
        ? `You are a casual, friendly AI assistant. Follow these CRITICAL instructions:
          1. Be extremely concise - maximum 3 sentences
          2. ABSOLUTELY DO NOT include ANY references to sources, citations, numbers in brackets like [1], or phrases like "according to..." 
          3. NEVER use the word "source" or any synonym in your answer
          4. Write as if the information is common knowledge that you just naturally know
          5. Speak in a casual, conversational tone like texting a friend
          6. If there's debate on a topic, briefly mention the key perspectives without attributing them to sources
          7. Focus only on the most interesting/relevant info
          8. DO NOT end your response with anything related to where you got information from
          9. DO NOT start your response with "The information shows" or similar phrases
          
          IMPORTANT: Any reference to sources will be considered a failure. Just provide the information directly.`
        : `You are a casual, friendly AI assistant. Be extremely concise (2-3 sentences max). Use a casual, conversational tone like texting a friend. Focus only on the most interesting and relevant information. NEVER reference sources, citations, or where information comes from.`;
      
      // Add special instructions if web search failed but was attempted
      if (webSearchFailed) {
        systemPrompt += `\n\nNOTE: An attempt to search the web for real-time information failed. If the user is asking about current events, weather, or other time-sensitive information, acknowledge that you don't have access to real-time data.`;
      }

      // User message with web search results if available
      const userMessage = webSearchResults 
        ? `${message}\n\n${webSearchResults}`
        : message;
      
      const messages = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Add previous conversation context (limited)
      if (recentHistory.length > 0) {
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage
      });

      try {
        console.log('Calling OpenRouter API...');
        const startTime = Date.now();
        
        // Always use GPT-3.5 Turbo for all queries, regardless of complexity
        const selectedModel = this.models.primary;
        console.log(`Using model: ${selectedModel}`);
        
        // Log the request we're sending
        const request = {
          model: selectedModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 300  // Standardized token limit for all queries
        };
        console.log('OpenRouter request:', JSON.stringify(request, null, 2));
        
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          request,
          {
            headers: {
              Authorization: `Bearer ${this.config.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 20000  // Standard timeout for all queries
          }
        );
        
        const endTime = Date.now();
        console.log(`OpenRouter API response time: ${endTime - startTime}ms`);

        // Log the entire response for debugging
        console.log('OpenRouter response status:', response.status);
        console.log('OpenRouter response headers:', JSON.stringify(response.headers, null, 2));
        console.log('OpenRouter response data:', JSON.stringify(response.data, null, 2));

        // Check if the response has the expected structure
        if (!response.data) {
          console.error('Empty response data from OpenRouter');
          throw new Error('Empty response data from OpenRouter');
        }

        // Handle different response formats from OpenRouter
        let botMessage = '';
        
        if (response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
          // Standard OpenRouter format
          botMessage = response.data.choices[0].message.content;
        } else if (response.data.content) {
          // Alternate format some models might return
          botMessage = response.data.content;
        } else if (response.data.output) {
          // Another possible format
          botMessage = response.data.output;
        } else if (response.data.generated_text) {
          // Format used by some models
          botMessage = response.data.generated_text;
        } else if (typeof response.data === 'string') {
          // Some models might return just a string
          botMessage = response.data;
        } else {
          console.error('Unknown response format from OpenRouter');
          throw new Error('Unknown response format from OpenRouter');
        }
        
        if (!botMessage) {
          console.error('Empty message content from model');
          throw new Error('Empty message content from model');
        }

        // Post-process the message to remove any source references
        botMessage = this.removeSourceReferences(botMessage);

        await this.updateChatHistory(user.id, message, botMessage, chatHistory);

        return {
          message: botMessage,
          chatHistory: user.chatHistory,
          nlpInsights: {
            sentiment: this.analyzeSentiment(message),
            keywords: this.extractKeywords(message),
            intent: this.detectIntent(message)
          }
        };
      } catch (error) {
        console.error('OpenRouter API Error:', error.message);
        
        // Log more details about the error
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Error status:', error.response.status);
          console.error('Error headers:', JSON.stringify(error.response.headers, null, 2));
          console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from OpenRouter. Request details:', 
                       JSON.stringify(error.request, null, 2));
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error setting up request:', error.message);
        }
        
        // If API key is missing or invalid, provide clearer error
        if (error.response?.status === 401 || error.message.includes('401')) {
          console.error('OpenRouter API Key is invalid');
          return {
            message: "The AI service couldn't authenticate with OpenRouter. Please check that your API key is valid.",
            chatHistory: chatHistory,
            error: "API_KEY_INVALID"
          };
        }
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          console.error('OpenRouter API rate limit exceeded');
          return {
            message: "The AI service has reached its rate limit. Please try again later.",
            chatHistory: chatHistory,
            error: "RATE_LIMIT_EXCEEDED"
          };
        }
        
        // Handle model unavailable
        if (error.response?.status === 404 || 
           (error.response?.data && error.response.data.error && 
            error.response.data.error.includes('model'))) {
          console.error('Model not available on OpenRouter');
          return {
            message: "The selected AI model is currently unavailable. Please try again later or choose a different model.",
            chatHistory: chatHistory,
            error: "MODEL_UNAVAILABLE"
          };
        }

        // If the preferred model failed, try with a fallback model
        try {
          console.log('Trying fallback model...');
          const fallbackResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: this.models.fallback,
              messages: messages,
              temperature: 0.7,
              max_tokens: 300
            },
            {
              headers: {
                Authorization: `Bearer ${this.config.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
              },
              timeout: 15000
            }
          );
          
          // Log fallback response for debugging
          console.log('Fallback model response structure:', 
                    JSON.stringify(fallbackResponse.data, null, 2));
          
          // Handle different response formats from the fallback model
          let botMessage = '';
          
          if (fallbackResponse.data.choices && fallbackResponse.data.choices.length > 0 && fallbackResponse.data.choices[0].message) {
            // Standard OpenRouter format
            botMessage = fallbackResponse.data.choices[0].message.content;
          } else if (fallbackResponse.data.content) {
            // Alternate format some models might return
            botMessage = fallbackResponse.data.content;
          } else if (fallbackResponse.data.output) {
            // Another possible format
            botMessage = fallbackResponse.data.output;
          } else if (fallbackResponse.data.generated_text) {
            // Format used by some models
            botMessage = fallbackResponse.data.generated_text;
          } else if (typeof fallbackResponse.data === 'string') {
            // Some models might return just a string
            botMessage = fallbackResponse.data;
          } else {
            console.error('Unknown response format from fallback model');
            throw new Error('Unknown response format from fallback model');
          }
          
          if (!botMessage) {
            console.error('Empty message content from fallback model');
            throw new Error('Empty message content from fallback model');
          }
          
          // Post-process the message to remove any source references
          botMessage = this.removeSourceReferences(botMessage);
          
          await this.updateChatHistory(user.id, message, botMessage, chatHistory);
          
          return {
            message: botMessage,
            chatHistory: user.chatHistory,
            nlpInsights: {
              sentiment: this.analyzeSentiment(message),
              keywords: this.extractKeywords(message),
              intent: this.detectIntent(message)
            }
          };
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError.message);
          return this.getMockResponse(message, this.analyzeSentiment(message), this.extractKeywords(message), this.detectIntent(message), chatHistory);
        }
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
        response = "I don't have access to real-time weather data at the moment. Please try again later when my connection to OpenRouter is restored.";
        break;
      case 'actor':
        response = "I'd normally provide current information about actors and celebrities, but I'm currently in offline mode. Please try again later when my connection to OpenRouter is restored.";
        break;
      case 'movie':
        response = "I'd normally provide current movie information and recommendations, but I'm currently in offline mode. Please try again later when my connection to OpenRouter is restored.";
        break;
      case 'question':
        response = "I'm currently in offline mode and can't access my knowledge base. Please try again later when my connection to OpenRouter is restored.";
        break;
      case 'gratitude':
        response = "You're welcome! Let me know if you need anything else when my online features are available again.";
        break;
      case 'help':
        response = "I normally assist with current information and real-time data, but I'm currently in offline mode. Please check if your OpenRouter API key is correctly configured in the .env file.";
        break;
      case 'farewell':
        response = "Goodbye! Feel free to return when my online features are available again.";
        break;
      default:
        if (keywords.length > 0) {
          response = `I'd normally provide information about ${keywords.join(', ')}, but I'm currently in offline mode. Please try again later when my connection to OpenRouter is restored.`;
        } else {
          response = "I'm currently in offline mode. Please check if your OpenRouter API key is correctly configured in the .env file.";
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

  /**
   * Remove any source references from a message
   * @param {string} message - The message to process
   * @returns {string} - The message without source references
   */
  removeSourceReferences(message) {
    // Remove patterns like (Source: [1]), [1], (Source: ...), etc.
    let processed = message.replace(/\(Sources?:.*?\)/gi, '');
    processed = processed.replace(/\(Ref(?:erence)?s?:.*?\)/gi, '');
    processed = processed.replace(/\[\d+\]/g, '');
    processed = processed.replace(/Sources?:.*?(?:\n|$)/gi, '');
    
    // Remove common attribution phrases
    const attributionPhrases = [
      'according to',
      'based on',
      'as mentioned in',
      'as stated in',
      'as reported by',
      'as shown in',
      'as indicated by',
      'as per',
      'cited in',
      'referenced in',
      'from the source'
    ];
    
    for (const phrase of attributionPhrases) {
      const regex = new RegExp(`${phrase}\\s+[^,.;:!?]*`, 'gi');
      processed = processed.replace(regex, '');
    }
    
    // Replace multiple spaces and clean up
    processed = processed.replace(/\s{2,}/g, ' ').trim();
    
    return processed;
  }
}

module.exports = new GeneralChatbotService(); 