const Users = require('../models/users');


class FallbackChatbotService {
  constructor() {
    // Base responses for different categories
    this.responses = [
      // Greetings
      {
        triggers: ['hello', 'hi', 'hey', 'greetings', 'howdy', 'hola'],
        responses: [
          "Hello! How can I help you with your music today?",
          "Hi there! I'm your music assistant. What can I do for you?",
          "Hey! Looking for music recommendations or help with playlists?"
        ]
      },
      // Music recommendations
      {
        triggers: ['recommend', 'suggestion', 'suggest', 'what should i listen to', 'music for'],
        responses: [
          "Based on what's popular right now, I'd recommend checking out the latest releases from The Weeknd, Taylor Swift, or Bad Bunny.",
          "Have you tried listening to lo-fi beats? They're great for focusing or relaxing.",
          "I think you might enjoy some classic rock - how about Queen, Led Zeppelin, or Pink Floyd?"
        ],
        contextual: {
          'workout': [
            "For a workout, try upbeat tracks from artists like Dua Lipa, The Chainsmokers, or Imagine Dragons to keep your energy high.",
            "A great workout playlist should include high-energy tracks around 120-140 BPM. Artists like Eminem, Daft Punk, and Lady Gaga work well!",
            "For workouts, I'd suggest a mix of EDM and hip-hop. Look for tracks by David Guetta, Kendrick Lamar, and Megan Thee Stallion."
          ],
          'study': [
            "For studying, ambient music or instrumental tracks work best. Check out artists like Brian Eno, Nils Frahm, or film scores by Hans Zimmer.",
            "When studying, instrumental lo-fi hip-hop is a popular choice. Look for the 'lofi beats to study to' playlists.",
            "For concentration while studying, try classical piano pieces by composers like Ludovico Einaudi or Max Richter."
          ],
          'relax': [
            "To relax, ambient electronic music by artists like Bonobo, Tycho, or Four Tet can create a calming atmosphere.",
            "For relaxation, acoustic folk tracks by artists like Bon Iver, Fleet Foxes, or Iron & Wine are wonderful choices.",
            "Jazz is perfect for relaxing - try albums by Miles Davis, John Coltrane, or more modern artists like Norah Jones."
          ],
          'party': [
            "For a party playlist, you can't go wrong with current pop hits by artists like Dua Lipa, The Weeknd, and Harry Styles.",
            "A great party needs upbeat tracks! Try mixing in dance music from Daft Punk, Calvin Harris, and classic party anthems.",
            "For parties, a mix of hip-hop, pop, and dance music works best. Include artists like Drake, Beyoncé, and Rihanna."
          ],
          'sleep': [
            "For sleep, ambient soundscapes by Brian Eno or Stars of the Lid can help you drift off.",
            "To help with sleep, try the gentle piano pieces by artists like Joep Beving or Ólafur Arnalds.",
            "Sleep playlists benefit from low-tempo, instrumental music. Try Max Richter's 'Sleep' album, specifically designed for this purpose."
          ],
          'sad': [
            "When you're feeling down, sometimes embracing those emotions with artists like Adele, Bon Iver, or Billie Eilish can be cathartic.",
            "For melancholic moods, singer-songwriters like Elliott Smith, Phoebe Bridgers, or Nick Drake create beautiful, reflective soundscapes.",
            "Sometimes sad music helps us process emotions. Try albums by Sufjan Stevens, Daughter, or The National."
          ],
          'happy': [
            "To lift your spirits, upbeat pop from Pharrell Williams, Bruno Mars, or Lizzo are great choices!",
            "For happy vibes, try indie pop bands like WALK THE MOON, Foster the People, or Passion Pit.",
            "Nothing beats classic feel-good tracks! Try a playlist with Earth, Wind & Fire, Whitney Houston, and The Jackson 5."
          ]
        }
      },
      // Playlist help
      {
        triggers: ['playlist', 'create playlist', 'new playlist', 'make a playlist'],
        responses: [
          "To create a playlist, click on 'Your Library' and then the 'Create Playlist' button.",
          "I can help you organize a playlist. What genre or mood are you going for?",
          "Creating themed playlists is fun! Try organizing one by decade or a specific mood.",
          "To create a playlist, first go to 'Your Library' in the sidebar, then click the 'Create Playlist' button. You can then add songs by searching and using the context menu to select 'Add to Playlist'."
        ]
      },
      // Artist information
      {
        triggers: ['artist', 'band', 'musician', 'singer', 'who is', 'tell me about'],
        responses: [
          "There are so many great artists to explore! Any specific genre you're interested in?",
          "Some trending artists right now include Billie Eilish, Doja Cat, and BTS.",
          "If you're looking for underrated artists, try exploring independent musicians in the Discover section."
        ],
        contextual: {
          'rock': [
            "Some legendary rock bands include Led Zeppelin, Pink Floyd, The Rolling Stones, and Queen. For modern rock, try Foo Fighters, Greta Van Fleet, or Tame Impala.",
            "Rock music has many sub-genres! Classic rock (The Beatles, The Who), punk rock (The Clash, Ramones), alternative rock (Radiohead, The Strokes), and many more.",
            "If you enjoy rock music, you might want to explore bands like Arctic Monkeys, Muse, or Royal Blood for modern rock with classic influences."
          ],
          'pop': [
            "Current pop stars dominating the charts include Taylor Swift, Ariana Grande, The Weeknd, and Harry Styles.",
            "Pop music is always evolving! Current pop draws influence from various genres, with artists like Doja Cat, Dua Lipa, and Olivia Rodrigo pushing boundaries.",
            "For pop music with depth and critical acclaim, check out artists like Lorde, Billie Eilish, or Frank Ocean who blend pop with other genres."
          ],
          'hip hop': [
            "Hip-hop's current stars include Kendrick Lamar, J. Cole, Drake, and Tyler, The Creator. For influential classics, look to artists like Tupac, Notorious B.I.G., and Jay-Z.",
            "Hip-hop has regional variations worth exploring - West Coast (Dr. Dre, Snoop Dogg), East Coast (Nas, Wu-Tang Clan), Southern (OutKast, Lil Wayne), and many more.",
            "Alternative and experimental hip-hop offers innovative sounds. Try artists like Run The Jewels, Vince Staples, or JPEGMAFIA."
          ],
          'jazz': [
            "Jazz pioneers include Louis Armstrong, Duke Ellington, and Charlie Parker. For more modern jazz, try Kamasi Washington, Robert Glasper, or Esperanza Spalding.",
            "Jazz has many sub-genres to explore: swing (Count Basie), bebop (Dizzy Gillespie), cool jazz (Miles Davis), and fusion (Herbie Hancock).",
            "If you're new to jazz, try starting with some accessible classics like Miles Davis' 'Kind of Blue', John Coltrane's 'A Love Supreme', or anything by Thelonious Monk."
          ],
          'electronic': [
            "Electronic music spans many genres: house (Daft Punk), techno (Carl Cox), ambient (Brian Eno), and EDM (Skrillex) just to name a few.",
            "Influential electronic artists include Aphex Twin, Kraftwerk, and Boards of Canada. For more current sounds, check out Four Tet, Bonobo, or Kaytranada.",
            "If you enjoy electronic music with emotional depth, try artists like Jon Hopkins, Burial, or Floating Points."
          ],
          'classical': [
            "Classical music spans centuries! From baroque (Bach, Vivaldi) to classical period (Mozart, Beethoven) to romantic (Chopin, Tchaikovsky) to modern (Debussy, Stravinsky).",
            "For approachable classical music, try movie composers like Hans Zimmer, John Williams, or Ludovico Einaudi who blend classical traditions with modern sounds.",
            "Contemporary classical composers like Max Richter, Philip Glass, and Ólafur Arnalds create beautiful pieces that appeal even to those new to classical music."
          ]
        }
      },
      // Genre exploration
      {
        triggers: ['genre', 'style', 'type of music'],
        responses: [
          "Some popular genres include pop, rock, hip-hop, R&B, country, and electronic music. What do you usually enjoy?",
          "Have you tried exploring world music? There are amazing sounds from different cultures.",
          "Classical music is great for concentration, while upbeat pop or rock can energize your workout."
        ]
      },
      // App features
      {
        triggers: ['how to', 'how do i', 'feature', 'can i', 'is it possible'],
        responses: [
          "Most features can be accessed through the main menu or right-click options. What specifically are you trying to do?",
          "Our app is designed to be intuitive. Have you tried using the search function at the top to find what you need?",
          "You can customize most features through the settings menu. What would you like to adjust?"
        ],
        contextual: {
          'download': [
            "To download music for offline listening, you'll need a Premium subscription. Then, look for the download icon next to albums or playlists.",
            "Premium users can download music by tapping the download icon (down arrow) on any album, playlist, or podcast.",
            "Downloading music requires a Premium subscription. Once you have that, you can tap the download icon on any content you want to save offline."
          ],
          'share': [
            "To share a song or playlist, click the three dots (...) next to the item, then select 'Share' and choose how you want to share it.",
            "Sharing is easy! Just right-click on any song, album, or playlist and select 'Share' from the menu.",
            "You can share music via a link, social media, or messaging apps. Just click the three dots next to what you want to share and select the 'Share' option."
          ],
          'profile': [
            "To edit your profile, click on your profile name in the top-right corner, then select 'Profile' and 'Edit profile'.",
            "Your profile can be customized by uploading a photo and adjusting your display name and other settings.",
            "Profile settings are accessed by clicking your username in the top-right corner and selecting 'Profile'."
          ]
        }
      },
      // Appreciation and thanks
      {
        triggers: ['thank', 'thanks', 'thank you', 'appreciate', 'helpful'],
        responses: [
          "You're welcome! Happy to help with your music needs.",
          "Anytime! Let me know if you need more music suggestions.",
          "No problem! Enjoy your music experience.",
          "Glad I could help! Feel free to ask about anything else music-related."
        ]
      },
      // Questions about the assistant
      {
        triggers: ['who are you', 'what are you', 'are you ai', 'are you human', 'are you a bot', 'your name'],
        responses: [
          "I'm your Spotify music assistant, designed to help you discover and enjoy music on this platform.",
          "I'm a musical companion here to help you navigate the app and discover new music you might love.",
          "Think of me as your personal music concierge. I'm here to make your experience more enjoyable!",
          "I'm an AI assistant specialized in music recommendations and helping you use this Spotify clone app."
        ]
      }
    ];
    
    // Default response when no match is found
    this.defaultResponses = [
      "I'm not sure I understand. Could you ask about music, artists, or playlists?",
      "Sorry, I didn't catch that. I can help with music recommendations or playlist suggestions.",
      "I'm your music assistant. Ask me about songs, artists, or playlists!",
      "I'm still learning! Try asking me about music recommendations or how to use specific features."
    ];
  }

  /**
   * Process a message and return a response based on sophisticated pattern matching
   * @param {string} message - The user's message
   * @param {object} user - The user object
   * @returns {Promise<object>} - The response object
   */
  async processMessage(message, user) {
    try {
      // Make sure user is an object and create a safe copy
      const safeUser = user || {};
      
      // Get user chat history or initialize if it doesn't exist
      let chatHistory = Array.isArray(safeUser.chatHistory) ? [...safeUser.chatHistory] : [];
      
      // Find a response based on the message content
      const lowerCaseMessage = message.toLowerCase();
      
      // Keywords extraction - identify main topics in the user's message
      const extractedKeywords = this.extractKeywords(lowerCaseMessage);
      console.log('Extracted keywords:', extractedKeywords);
      
      // Default response if no matches found
      let response = this.defaultResponses[Math.floor(Math.random() * this.defaultResponses.length)];
      
      // Try to find contextual responses first (more specific)
      let foundContextualResponse = false;
      
      // First, look for multi-keyword context matches for more relevant responses
      if (extractedKeywords.length > 1) {
        // Try combinations of keywords to find more specific matches
        for (let i = 0; i < extractedKeywords.length; i++) {
          for (let j = i + 1; j < extractedKeywords.length; j++) {
            const keyword1 = extractedKeywords[i];
            const keyword2 = extractedKeywords[j];
            
            for (const pattern of this.responses) {
              if (!pattern.contextual) continue;
              
              // Check if any trigger matches
              if (pattern.triggers.some(trigger => lowerCaseMessage.includes(trigger))) {
                for (const [context, contextResponses] of Object.entries(pattern.contextual)) {
                  // Look for contexts that match multiple keywords
                  if (context.includes(keyword1) && context.includes(keyword2)) {
                    response = contextResponses[Math.floor(Math.random() * contextResponses.length)];
                    foundContextualResponse = true;
                    console.log(`Found multi-keyword match: ${keyword1}, ${keyword2} in context: ${context}`);
                    break;
                  }
                }
              }
              
              if (foundContextualResponse) break;
            }
            
            if (foundContextualResponse) break;
          }
          
          if (foundContextualResponse) break;
        }
      }
      
      // If no multi-keyword match, try single keyword matches
      if (!foundContextualResponse) {
        for (const pattern of this.responses) {
          // Skip patterns without contextual responses
          if (!pattern.contextual) continue;
          
          // Check if any trigger matches
          if (pattern.triggers.some(trigger => lowerCaseMessage.includes(trigger))) {
            // Look for contextual keywords
            for (const [context, contextResponses] of Object.entries(pattern.contextual)) {
              for (const keyword of extractedKeywords) {
                if (context.includes(keyword)) {
                  // We found a contextual match - use one of these specific responses
                  response = contextResponses[Math.floor(Math.random() * contextResponses.length)];
                  foundContextualResponse = true;
                  console.log(`Found keyword match: ${keyword} in context: ${context}`);
                  break;
                }
              }
              if (foundContextualResponse) break;
            }
          }
          
          // If we found a contextual response, no need to check other patterns
          if (foundContextualResponse) break;
        }
      }
      
      // If no contextual response was found, try general patterns
      if (!foundContextualResponse) {
        for (const pattern of this.responses) {
          if (pattern.triggers.some(trigger => lowerCaseMessage.includes(trigger))) {
            response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
            console.log(`Found general match with trigger in pattern`);
            break;
          }
        }
      }
      
      // Handle follow-up questions based on recent chat history
      if (chatHistory.length >= 2 && lowerCaseMessage.length < 30 && !foundContextualResponse) {
        const lastBotMessage = chatHistory[chatHistory.length - 1].content;
        const lastUserMessage = chatHistory[chatHistory.length - 2].content;
        
        const isFollowUp = lowerCaseMessage.includes('yes') || 
                          lowerCaseMessage.includes('sure') || 
                          lowerCaseMessage.includes('tell me more') ||
                          lowerCaseMessage.includes('why') ||
                          lowerCaseMessage.includes('how') ||
                          lowerCaseMessage === 'no' ||
                          lowerCaseMessage === 'ok' ||
                          lowerCaseMessage.includes('what about') ||
                          lowerCaseMessage.includes('like what') ||
                          lowerCaseMessage.includes('examples') ||
                          lowerCaseMessage.includes('example') ||
                          lowerCaseMessage.includes('such as');
        
        if (isFollowUp) {
          console.log('Detected follow-up question');
          if (lastBotMessage.includes('playlist')) {
            response = "Creating a great playlist is about flow. Start with songs you absolutely love, then build around them with similar tracks. Try organizing by energy levels - starting chill, building up, then winding down again.";
          } else if (lastBotMessage.includes('recommend') || lastBotMessage.includes('suggestion')) {
            response = "If you enjoy discovering new music, I'd suggest checking out some of our curated playlists based on your listening habits. The 'Discover Weekly' playlist is refreshed every Monday with songs you might like based on your taste.";
          } else if (lastBotMessage.includes('artist') || lastBotMessage.includes('band')) {
            response = "One approach to discovering artists is to start with someone you like, then explore related artists. Many musicians have interesting collaboration networks that can lead you to new sounds you'll enjoy.";
          } else if (this.detectMusicGenre(lastBotMessage)) {
            const genre = this.detectMusicGenre(lastBotMessage);
            response = this.getMusicRecommendation(genre);
          }
        }
      }
      
      // If the message is a direct question about music recommendations with genre
      const musicGenreInQuestion = this.detectMusicGenre(lowerCaseMessage);
      if (musicGenreInQuestion && !foundContextualResponse && 
          (lowerCaseMessage.includes('recommend') || 
           lowerCaseMessage.includes('suggest') || 
           lowerCaseMessage.includes('what') || 
           lowerCaseMessage.includes('like'))) {
        response = this.getMusicRecommendation(musicGenreInQuestion);
        console.log(`Generated genre-specific recommendation for: ${musicGenreInQuestion}`);
      }
      
      // Update chat history
      chatHistory.push({ role: "user", content: message });
      chatHistory.push({ role: "assistant", content: response });
      
      // Limit history to last 20 messages to prevent it from growing too large
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(chatHistory.length - 20);
      }
      
      // Ensure every message has a role
      chatHistory = chatHistory.map(msg => {
        if (!msg.role) {
          return { ...msg, role: "assistant" };
        }
        return msg;
      });
      
      // Try to save updated chat history to user, but continue even if it fails
      try {
        if (safeUser.id) {
          await Users.update({ chatHistory }, { where: { id: safeUser.id } });
        }
      } catch (dbError) {
        console.log('Could not save chat history to database. Using in-memory chat only.', dbError.message);
        // Don't throw the error, just continue with in-memory chat
      }
      
      return {
        message: response,
        chatHistory
      };
    } catch (error) {
      console.error('Error in fallback chatbot service:', error);
      // Return a default response even if there's an error
      return {
        message: "I'm your music assistant. How can I help you today?",
        chatHistory: Array.isArray(user?.chatHistory) ? [...user.chatHistory] : []
      };
    }
  }

  /**
   * Extract keywords from a message for better context matching
   * @private
   * @param {string} message - User's message
   * @returns {string[]} - Array of keywords
   */
  extractKeywords(message) {
    // Common words to filter out
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'in', 'on', 'at', 'to', 'with', 
                       'about', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 
                       'have', 'has', 'had', 'do', 'does', 'did', 'could', 'would', 'should', 
                       'can', 'will', 'my', 'your', 'our', 'their', 'his', 'her', 'its', 'i', 'you', 
                       'he', 'she', 'it', 'we', 'they', 'me', 'him', 'some', 'this', 'that'];
    
    // Music-related words with higher priority
    const musicKeywords = ['rock', 'pop', 'hip hop', 'rap', 'jazz', 'blues', 'classical', 'country', 
                          'electronic', 'dance', 'folk', 'indie', 'metal', 'r&b', 'soul', 'funk', 
                          'reggae', 'punk', 'alternative', 'instrumental', 'ambient', 'workout', 
                          'party', 'study', 'focus', 'sleep', 'relax', 'energetic', 'sad', 'happy',
                          'playlist', 'album', 'song', 'track', 'artist', 'band', 'singer', 'genre',
                          'mood', 'feeling', 'tempo', 'beat', 'melody', 'lyrics', 'recommend', 'suggestion',
                          'similar', 'like', 'favorite', 'best', 'top', 'new', 'old', 'classic', 'modern'];
    
    // Split the message into words and filter out stop words
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => !stopWords.includes(word) && word.length > 1);
    
    // Check for multi-word music genres and terms
    const multiWordKeywords = [];
    const musicMultiwords = ['hip hop', 'r&b', 'rock and roll', 'drum and bass', 'lo fi', 
                            'instrumental music', 'classical music', 'indie rock', 'indie pop',
                            'heavy metal', 'soft rock', 'hard rock', 'electronic dance', 'edm',
                            'jazz fusion', 'smooth jazz', 'acid jazz', 'contemporary jazz',
                            'pop rock', 'pop punk', 'alternative rock', 'alternative metal',
                            'folk rock', 'country rock', 'blues rock', 'punk rock', 'funk rock',
                            'rap music', 'trap music', 'ambient music', 'dance music'];
    
    for (const term of musicMultiwords) {
      if (message.toLowerCase().includes(term)) {
        multiWordKeywords.push(term);
      }
    }
    
    // Prioritize music keywords
    const musicWordsFound = words.filter(word => musicKeywords.includes(word));
    const otherWords = words.filter(word => !musicKeywords.includes(word));
    
    // Return music keywords first (they're more important), then multiword terms, then other words
    return [...musicWordsFound, ...multiWordKeywords, ...otherWords];
  }
  
  /**
   * Detect music genre in a message
   * @private
   * @param {string} message - Message to analyze
   * @returns {string|null} - Detected genre or null
   */
  detectMusicGenre(message) {
    const genres = [
      'rock', 'pop', 'hip hop', 'rap', 'jazz', 'blues', 'classical', 'country', 
      'electronic', 'dance', 'folk', 'indie', 'metal', 'r&b', 'soul', 
      'funk', 'reggae', 'punk', 'alternative', 'ambient', 'techno'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const genre of genres) {
      if (lowerMessage.includes(genre)) {
        return genre;
      }
    }
    
    // Check for activity-based music
    const activities = {
      'workout': 'workout',
      'exercise': 'workout',
      'gym': 'workout',
      'running': 'workout',
      'studying': 'study',
      'study': 'study',
      'focus': 'study',
      'work': 'study',
      'concentration': 'study',
      'sleep': 'sleep',
      'sleeping': 'sleep',
      'relaxing': 'relax',
      'relax': 'relax',
      'chill': 'relax',
      'party': 'party',
      'celebration': 'party',
      'dancing': 'party'
    };
    
    for (const [activity, category] of Object.entries(activities)) {
      if (lowerMessage.includes(activity)) {
        return category;
      }
    }
    
    // Check for mood-based music
    const moods = {
      'sad': 'sad',
      'happy': 'happy',
      'energetic': 'energetic',
      'melancholy': 'sad',
      'upbeat': 'happy',
      'cheerful': 'happy',
      'depressed': 'sad',
      'excited': 'energetic',
      'motivation': 'energetic',
      'peaceful': 'relax'
    };
    
    for (const [mood, category] of Object.entries(moods)) {
      if (lowerMessage.includes(mood)) {
        return category;
      }
    }
    
    return null;
  }
  
  /**
   * Get music recommendation based on genre/context
   * @private
   * @param {string} genre - Music genre or context
   * @returns {string} - Recommendation text
   */
  getMusicRecommendation(genre) {
    const recommendations = {
      'rock': [
        "For rock music, you might enjoy classics like Led Zeppelin's 'Stairway to Heaven', Queen's 'Bohemian Rhapsody', or more modern tracks like Foo Fighters' 'Everlong'. What kind of rock do you prefer?",
        "Rock has many great sub-genres to explore. If you like classic rock, try The Rolling Stones or The Who. For alternative rock, check out Radiohead or Arctic Monkeys. For harder rock, try Metallica or Tool.",
        "Some of my favorite rock albums include Pink Floyd's 'Dark Side of the Moon', Nirvana's 'Nevermind', and The Beatles' 'Abbey Road'. These are all-time classics that showcase different aspects of rock music."
      ],
      'pop': [
        "For pop music, recent hits by artists like Taylor Swift, The Weeknd, and Dua Lipa are dominating the charts. Taylor's 'Midnights' album has been particularly popular.",
        "If you're into pop music, check out Olivia Rodrigo's 'SOUR' album, Harry Styles' 'Fine Line', or Billie Eilish's 'Happier Than Ever' for some recent critically-acclaimed pop.",
        "Pop music is constantly evolving! Current pop stars like Ariana Grande, Justin Bieber, and BTS blend elements of R&B, dance, and hip-hop into their sound. For something with an 80s pop vibe, try The Weeknd's 'After Hours'."
      ],
      'hip hop': [
        "For hip-hop, recent standout albums include Kendrick Lamar's 'Mr. Morale & the Big Steppers', Tyler, The Creator's 'CALL ME IF YOU GET LOST', and J. Cole's 'The Off-Season'.",
        "Hip-hop has so many styles! For lyrical depth, try Kendrick Lamar or J. Cole. For more trap-influenced sound, check out Travis Scott or Future. For old-school vibes, you can't go wrong with Nas or A Tribe Called Quest.",
        "Some recent hip-hop tracks getting a lot of plays include Drake's collaborations, anything by Megan Thee Stallion, and Lil Nas X's boundary-pushing work. What kind of hip-hop do you usually enjoy?"
      ],
      'jazz': [
        "For jazz, try classics like Miles Davis' 'Kind of Blue' or John Coltrane's 'A Love Supreme'. For modern jazz, check out Kamasi Washington's 'The Epic' or anything by Robert Glasper who blends jazz with hip-hop and R&B.",
        "Jazz is such a rich genre! If you're new to it, start with accessible artists like Dave Brubeck or Chet Baker. For vocal jazz, Ella Fitzgerald and Billie Holiday are timeless. And for contemporary jazz, try Norah Jones or GoGo Penguin.",
        "Jazz spans over a century of innovation. From Louis Armstrong's foundational work to fusion pioneers like Herbie Hancock, to modern innovators like Esperanza Spalding - there's always something new to discover in jazz!"
      ],
      'workout': [
        "For workouts, I'd recommend high-energy tracks with strong beats - try playlists with artists like Dua Lipa, The Chemical Brothers, or Kanye West. Aim for songs around 120-140 BPM to match your workout intensity.",
        "When working out, EDM and hip-hop tend to be popular choices. Artists like David Guetta, Megan Thee Stallion, and Imagine Dragons have tracks that can keep your energy high throughout your session.",
        "For your workout, try a mix of motivational tracks from different genres - 'Power' by Kanye West, 'Physical' by Dua Lipa, 'Stronger' by The Killers, or 'Can't Hold Us' by Macklemore & Ryan Lewis are great for keeping the energy up!"
      ],
      'study': [
        "For studying, instrumental music works best - try lo-fi beats, ambient composers like Brian Eno, or classical piano pieces by Ludovico Einaudi to improve focus without lyrical distractions.",
        "When studying, look for music with minimal lyrics. The 'lofi hip hop radio - beats to study/relax to' streams are popular for a reason! Also consider modern classical composers like Max Richter or Ólafur Arnalds.",
        "For focus and concentration, ambient electronic music by artists like Tycho, Bonobo, or Four Tet creates a productive atmosphere. Film scores by Hans Zimmer or Joe Hisaishi are also excellent for deep work sessions."
      ],
      'relax': [
        "To relax, try acoustic folk tracks by artists like Bon Iver or Fleet Foxes, ambient music by Brian Eno, or gentle jazz from the 'Cool Jazz' era with Miles Davis or Chet Baker.",
        "For relaxation, ambient electronic artists like Boards of Canada or Tycho create beautiful soundscapes. If you prefer something more organic, try acoustic artists like José González or Nick Drake.",
        "When you want to unwind, nothing beats some ambient or downtempo music. Check out albums like 'Blue' by Joni Mitchell, 'Moon Safari' by Air, or 'In A Silent Way' by Miles Davis - all perfectly capture a relaxed, contemplative mood."
      ],
      'sad': [
        "For melancholic moments, try Elliott Smith's intimate songwriting, Sufjan Stevens' 'Carrie & Lowell', Phoebe Bridgers' 'Punisher', or the atmospheric sadness of The National's 'Trouble Will Find Me'.",
        "When you're feeling down, sometimes embracing those emotions through music can be cathartic. Artists like Adele, Bon Iver, and Billie Eilish create powerful emotional landscapes with their music.",
        "For sad music with depth, try albums like Frank Ocean's 'Blonde', Radiohead's 'A Moon Shaped Pool', or Mount Eerie's 'A Crow Looked at Me' - all process difficult emotions through beautiful, affecting songs."
      ],
      'happy': [
        "For instant mood-lifting, try upbeat classics like Earth, Wind & Fire's 'September', modern pop like Pharrell's 'Happy', or the infectious energy of Bruno Mars' 'Uptown Funk'.",
        "To boost your mood, look for tracks with uplifting melodies and positive lyrics. Artists like CHVRCHES, WALK THE MOON, and Lizzo are great for creating an instant happy atmosphere.",
        "Nothing beats feel-good classics for lifting your spirits! Try a mix of Stevie Wonder, Whitney Houston, and Michael Jackson, or more recent happy-inducing tracks from artists like Beyoncé or Daft Punk."
      ],
      'party': [
        "For a party playlist, mix current hits from artists like Doja Cat, Bad Bunny, and The Weeknd with classic party anthems from the likes of Madonna, Prince, and Michael Jackson.",
        "Keep your party energy high with a blend of genres - dance tracks from Dua Lipa or Calvin Harris, hip-hop bangers from Drake or Cardi B, and pop anthems from artists like Lady Gaga or Bruno Mars.",
        "The perfect party playlist balances familiar hits everyone can sing along to with fresh tracks that keep things interesting. Try mixing classics like 'Don't Stop Believin'' with current dance hits and throwback 90s/2000s tracks."
      ],
      'sleep': [
        "For sleep, ambient composer Brian Eno's 'Ambient 1: Music for Airports' is a classic choice. Also try Max Richter's 'Sleep' album, specifically designed for overnight listening.",
        "When trying to fall asleep, look for music with slow tempos, minimal percussion, and gentle progressions. Artists like Sigur Rós (slower tracks), Grouper, or Stars of the Lid create perfect sleep soundscapes.",
        "For better sleep, instrumental music with 60-80 BPM helps match your resting heart rate. Try Icelandic pianist Ólafur Arnalds, the ambient works of Nils Frahm, or gentle classical pieces by Erik Satie."
      ],
      'classical': [
        "In classical music, try starting with accessible pieces like Debussy's 'Clair de Lune', Beethoven's 'Moonlight Sonata', or Vivaldi's 'Four Seasons' if you're just beginning to explore the genre.",
        "Classical music spans centuries! For baroque, try Bach's 'Brandenburg Concertos'. For classical period, Mozart's symphonies are wonderful. For romantic pieces, Chopin's piano works are unmatched in their emotion.",
        "For modern classical that bridges traditional and contemporary sounds, try composers like Philip Glass, Ludovico Einaudi, or Max Richter - they're great gateway artists if you're new to classical music."
      ],
      'electronic': [
        "Electronic music is incredibly diverse! For dancing, try house artists like Disclosure or tech house from artists like Fisher. For listening, Bonobo and Four Tet create beautiful electronic soundscapes.",
        "If you're exploring electronic music, consider artists like Daft Punk for accessible dance music, Aphex Twin for more experimental sounds, or Tycho for downtempo electronic with organic elements.",
        "Electronic music has many exciting subgenres - from ambient works by Brian Eno, to the textured IDM of Boards of Canada, to the dance-floor focus of Kaytranada or Jamie xx. What kind of mood are you looking for?"
      ],
      'indie': [
        "For indie music, try acclaimed albums like Arcade Fire's 'Funeral', Vampire Weekend's self-titled debut, or something more recent like Big Thief's 'U.F.O.F.' - all showcase the diversity of independent music.",
        "The indie scene is constantly evolving! Artists like Phoebe Bridgers, Japanese Breakfast, and The War on Drugs are creating some of today's most critically-acclaimed independent music.",
        "Indie rock favorites include bands like Arctic Monkeys, The Strokes, and Tame Impala, while indie folk offers artists like Fleet Foxes, Bon Iver, and The Lumineers. Each brings a unique sound to independent music."
      ]
    };
    
    // Default to general recommendation if genre not found
    if (!recommendations[genre]) {
      return "I'd recommend exploring our curated playlists based on your listening history. They're updated regularly with new music that matches your taste profile. The Discover Weekly playlist is particularly good for finding new artists you might enjoy.";
    }
    
    // Return a random recommendation for the genre
    return recommendations[genre][Math.floor(Math.random() * recommendations[genre].length)];
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
        return [];
      }
      
      return user.chatHistory || [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      return []; // Return empty history on error
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
      // Just log the error, no need to throw
    }
  }
}

module.exports = new FallbackChatbotService(); 