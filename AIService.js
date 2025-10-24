// AI Service - Handles both online and offline AI inference
import axios from 'axios';
import { initLlama, convertJsonSchemaToGrammar, } from 'llama.rn';

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

      // Using Groq API with streaming
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey || 'gsk_demo_key'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                if (onChunk) {
                  onChunk(content);
                }
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        }
      }

      return {
        success: true,
        text: fullText,
        mode: 'online'
      };

    } catch (error) {
      console.error('Online AI error:', error);
      
      // Fallback to demo mode if API fails
      if (error.message.includes('401')) {
        return {
          success: false,
          error: 'Invalid API key. Please check your Groq API key in settings.',
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

      // Generate response using llama.cpp via llama.rn
      const response = await this.llamaContext.completion(
        {
          prompt: prompt,
          n_predict: 512,
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          stop: ['</s>', 'User:', '\nUser:', '[INST]'],
        },
        (data) => {
          // Stream token-by-token (optional)
          if (onChunk) {
            onChunk(data.token);
          }
        }
      );
      
      return {
        success: true,
        text: response.text.trim(),
        mode: 'offline'
      };

    } catch (error) {
      console.error('Offline AI error:', error);
      return {
        success: false,
        error: error.message,
        text: `Error running offline AI: ${error.message}\n\nMake sure:\n1. Model is downloaded\n2. App has enough memory (close other apps)\n3. Try restarting the app`,
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
      console.log('Loading model from:', modelPath);
      
      // Initialize llama.cpp context with the downloaded model
      const context = await initLlama({
        model: modelPath,
        n_ctx: 2048,        // Context window size
        n_batch: 512,       // Batch size for processing
        n_threads: 4,       // Number of CPU threads (adjust for device)
        use_mlock: true,    // Keep model in RAM for faster inference
        n_gpu_layers: 0,    // Use CPU (Metal GPU support coming soon)
      });
      
      this.llamaContext = context;
      
      return {
        success: true,
        message: 'Model loaded successfully!'
      };
    } catch (error) {
      console.error('Error loading model:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async releaseModel() {
    if (this.llamaContext) {
      try {
        await this.llamaContext.release();
        this.llamaContext = null;
        return { success: true };
      } catch (error) {
        console.error('Error releasing model:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  }
}

export default AIService;
