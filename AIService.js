// AI Service - Handles both online and offline AI inference
import axios from 'axios';

export class AIService {
  constructor() {
    this.mode = 'online'; // 'online' or 'offline'
    this.apiKey = null;
    this.llamaContext = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async generateResponse(messages, onChunk = null) {
    if (this.mode === 'online') {
      return await this.generateOnline(messages, onChunk);
    } else {
      return await this.generateOffline(messages, onChunk);
    }
  }

  // Online mode using Groq API (free, fast)
  async generateOnline(messages, onChunk) {
    try {
      console.log('API Key check:', this.apiKey ? `Key present (${this.apiKey.length} chars)` : 'No key');
      
      // Format messages for API
      const formattedMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Add system message
      formattedMessages.unshift({
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise and friendly.'
      });

      // Using Groq API (free tier available)
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey || 'gsk_demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        return {
          success: true,
          text: response.data.choices[0].message.content,
          mode: 'online'
        };
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Online AI error:', error);
      console.error('Error details:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      // Fallback to demo mode if API fails
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Invalid API key. Please check your Groq API key in settings.',
          text: this.getDemoResponse(messages),
          mode: 'demo'
        };
      }
      
      if (error.response?.status === 400) {
        return {
          success: false,
          error: `Bad request: ${error.response?.data?.error?.message || 'Check your API key and try again.'}`,
          text: this.getDemoResponse(messages),
          mode: 'demo'
        };
      }
      
      return {
        success: false,
        error: error.message,
        text: this.getDemoResponse(messages),
        mode: 'demo'
      };
    }
  }

  // Offline mode using local model
  async generateOffline(messages, onChunk) {
    try {
      // Check if model is loaded
      if (!this.llamaContext) {
        throw new Error('Local model not loaded. Please download the model first or switch to online mode.');
      }

      // Build prompt from conversation history
      const prompt = this.buildPrompt(messages);

      // Generate response using llama.cpp
      // This would use react-native-llama when integrated
      /* 
      const response = await this.llamaContext.completion({
        prompt: prompt,
        n_predict: 512,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        stop: ['</s>', 'User:', '\nUser:'],
      });
      
      return {
        success: true,
        text: response.text.trim(),
        mode: 'offline'
      };
      */

      // Demo response for now (until native module is integrated)
      return {
        success: false,
        error: 'Offline mode requires native integration',
        text: '🤖 Offline AI Response (Demo)\n\nThis is a simulated response. To use the actual downloaded model, you need to:\n\n1. Build native modules with llama.cpp\n2. Integrate react-native-llama\n3. Load the downloaded GGUF model\n\nFor now, please use Online Mode for real AI responses!',
        mode: 'offline-demo'
      };

    } catch (error) {
      console.error('Offline AI error:', error);
      return {
        success: false,
        error: error.message,
        text: error.message,
        mode: 'offline'
      };
    }
  }

  buildPrompt(messages) {
    let prompt = '<s>[INST] ';
    
    messages.forEach((msg, index) => {
      if (msg.sender === 'user') {
        if (index > 0) prompt += '[INST] ';
        prompt += msg.text + ' [/INST]';
      } else {
        prompt += ' ' + msg.text + '</s>';
      }
    });
    
    return prompt;
  }

  getDemoResponse(messages) {
    const lastMessage = messages[messages.length - 1]?.text.toLowerCase() || '';
    
    // Simple pattern matching for demo
    if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
      return "Hello! I'm currently in demo mode. For real AI responses, please add a Groq API key in settings or wait for offline model integration.";
    } else if (lastMessage.includes('how are you')) {
      return "I'm doing well, thank you! I'm running in demo mode. To get actual AI responses, switch to online mode and add an API key in settings.";
    } else if (lastMessage.includes('help')) {
      return "I can help you with various tasks! Right now I'm in demo mode. For full AI capabilities:\n\n• Online Mode: Add Groq API key (free at groq.com)\n• Offline Mode: Coming soon with native integration";
    } else {
      return `I received your message: "${messages[messages.length - 1]?.text}"\n\nCurrently in demo mode. For real AI responses:\n\n✓ Switch to Online Mode\n✓ Add API key in Settings\n✓ Or wait for offline model support`;
    }
  }

  async loadLocalModel(modelPath) {
    try {
      // This would initialize llama.cpp context
      // For now, just simulate
      console.log('Loading model from:', modelPath);
      
      /*
      const context = await initLlama({
        model: modelPath,
        n_ctx: 2048,
        n_batch: 512,
        n_threads: 4,
        use_mlock: true,
      });
      
      this.llamaContext = context;
      */
      
      return {
        success: false,
        error: 'Native integration required'
      };
    } catch (error) {
      console.error('Error loading model:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AIService;
