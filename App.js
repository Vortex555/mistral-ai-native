import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import ModelDownloader from './ModelDownloader';
import AIService from './AIService';

// Note: react-native-llama would be imported here in a full implementation
// import { initLlama, LlamaContext } from 'react-native-llama';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInitialized, setModelInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false); // Changed to false - skip welcome by default
  const [showSettings, setShowSettings] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [aiMode, setAiMode] = useState('online'); // 'online' or 'offline'
  const [apiKey, setApiKey] = useState('');
  const scrollViewRef = useRef();
  const modelDownloader = useRef(new ModelDownloader());
  const aiService = useRef(new AIService());
  
  // This would hold the actual llama context
  const llamaContext = useRef(null);

  useEffect(() => {
    checkModelStatus();
    loadMessages();
    loadSettings();
    loadChatSessions();
    autoInitializeModel();
  }, []);

  const autoInitializeModel = async () => {
    try {
      const modelPath = `${FileSystem.documentDirectory}mistral-7b-instruct-q4.gguf`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      // Check if we should auto-initialize (if user was in offline mode)
      const savedMode = await AsyncStorage.getItem('ai_mode');
      
      // If model file exists and user was in offline mode, load it
      if (fileInfo.exists && savedMode === 'offline' && !aiService.current.llamaContext) {
        console.log('Model file found, initializing for offline mode...');
        setIsInitializing(true);
        
        const result = await aiService.current.loadLocalModel(modelPath);
        
        if (result.success) {
          console.log('Model auto-initialized successfully');
          setModelInitialized(true);
        } else {
          console.log('Model initialization failed:', result.error);
          setModelInitialized(false);
          // Switch back to online mode if initialization failed
          setAiMode('online');
          await AsyncStorage.setItem('ai_mode', 'online');
        }
        
        setIsInitializing(false);
      } else if (!fileInfo.exists && savedMode === 'offline') {
        // Model file doesn't exist but user was in offline mode
        // Switch to online mode
        setAiMode('online');
        await AsyncStorage.setItem('ai_mode', 'online');
      } else {
        // Either in online mode or model already initialized
        setModelInitialized(aiService.current.llamaContext !== null);
      }
    } catch (error) {
      console.log('Auto-initialize error:', error.message);
      setIsInitializing(false);
      setModelInitialized(false);
      // Switch to online mode on error
      setAiMode('online');
      await AsyncStorage.setItem('ai_mode', 'online');
    }
  };

  const checkModelStatus = async () => {
    try {
      const modelPath = `${FileSystem.documentDirectory}mistral-7b-instruct-q4.gguf`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      setModelLoaded(fileInfo.exists);
      // Removed: No longer auto-hide welcome screen
    } catch (error) {
      console.error('Error checking model:', error);
      setModelLoaded(false);
    }
  };

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chat_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('ai_mode');
      const savedApiKey = await AsyncStorage.getItem('api_key');
      
      if (savedMode) setAiMode(savedMode);
      if (savedApiKey) {
        setApiKey(savedApiKey);
        aiService.current.setApiKey(savedApiKey);
      }
      
      aiService.current.setMode(savedMode || 'online');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (mode, key) => {
    try {
      await AsyncStorage.setItem('ai_mode', mode);
      if (key) {
        const trimmedKey = key.trim();
        await AsyncStorage.setItem('api_key', trimmedKey);
        aiService.current.setApiKey(trimmedKey);
        console.log('API key saved, length:', trimmedKey.length);
      }
      
      aiService.current.setMode(mode);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('chat_messages', JSON.stringify(newMessages));
      // Also save to current session
      if (currentSessionId) {
        await saveChatSession(currentSessionId, newMessages);
      }
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  // Chat Sessions Management
  const loadChatSessions = async () => {
    try {
      const sessionsData = await AsyncStorage.getItem('chat_sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        setChatSessions(sessions);
        
        // Load the most recent session or create new one
        if (sessions.length > 0) {
          const lastSession = sessions[0];
          setCurrentSessionId(lastSession.id);
          setMessages(lastSession.messages || []);
        } else {
          createNewChat();
        }
      } else {
        createNewChat();
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      createNewChat();
    }
  };

  const saveChatSession = async (sessionId, sessionMessages) => {
    try {
      const sessionsData = await AsyncStorage.getItem('chat_sessions');
      let sessions = sessionsData ? JSON.parse(sessionsData) : [];
      
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      const sessionTitle = sessionMessages.length > 0 
        ? sessionMessages[0].text.substring(0, 30) + (sessionMessages[0].text.length > 30 ? '...' : '')
        : 'New Chat';
      
      const updatedSession = {
        id: sessionId,
        title: sessionTitle,
        messages: sessionMessages,
        timestamp: Date.now(),
      };
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex] = updatedSession;
      } else {
        sessions.unshift(updatedSession);
      }
      
      // Keep only last 50 sessions
      sessions = sessions.slice(0, 50);
      
      await AsyncStorage.setItem('chat_sessions', JSON.stringify(sessions));
      setChatSessions(sessions);
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  };

  const createNewChat = () => {
    const newSessionId = Date.now().toString();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setShowChatHistory(false);
  };

  const loadChatSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages || []);
      setShowChatHistory(false);
    }
  };

  const deleteChatSession = async (sessionId) => {
    try {
      const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
      await AsyncStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
      setChatSessions(updatedSessions);
      
      // If deleted current session, create new one
      if (sessionId === currentSessionId) {
        if (updatedSessions.length > 0) {
          loadChatSession(updatedSessions[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  const deleteModel = async () => {
    Alert.alert(
      'Delete Model',
      'This will permanently delete the downloaded model file (4GB). You can re-download it later from settings.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const modelPath = `${FileSystem.documentDirectory}mistral-7b-instruct-q4.gguf`;
              await FileSystem.deleteAsync(modelPath, { idempotent: true });
              
              // Release model from memory if loaded
              if (aiService.current.llamaContext) {
                await aiService.current.releaseModel();
              }
              
              setModelLoaded(false);
              
              // Switch to online mode if in offline mode
              if (aiMode === 'offline') {
                setAiMode('online');
                await saveSettings('online', apiKey);
              }
              
              Alert.alert('Success', 'Model deleted successfully. You can re-download it from settings if needed.');
            } catch (error) {
              Alert.alert('Error', `Failed to delete model: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const downloadModel = async () => {
    // Check storage space first
    const storageCheck = await modelDownloader.current.checkStorageSpace();
    
    if (!storageCheck.hasSpace) {
      Alert.alert(
        'Insufficient Storage',
        `You need at least ${modelDownloader.current.formatBytes(storageCheck.required)} free space.\nAvailable: ${modelDownloader.current.formatBytes(storageCheck.available)}`
      );
      return;
    }

    // Show download modal and start download
    setShowDownloadModal(true);
    setShowSettings(false); // Close settings if open
    setIsInitializing(true);
    setDownloadProgress(0);
    setDownloadSpeed(0);
    
    try {
      const result = await modelDownloader.current.downloadModel(
        (progressData) => {
          setDownloadProgress(progressData.progress);
          setDownloadSpeed(progressData.speed || 0);
        }
      );
      
      if (result.success) {
        setShowDownloadModal(false);
        setIsInitializing(false);
        Alert.alert(
          'Download Complete! ✓', 
          `Model successfully downloaded (4.08 GB) and verified!\n\nThe model is now ready to use offline.`,
          [{ 
            text: 'OK', 
            onPress: async () => {
              await checkModelStatus();
              await initializeModel();
            }
          }]
        );
      } else if (result.cancelled) {
        // User cancelled
        setShowDownloadModal(false);
        setIsInitializing(false);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Download error:', error);
      setShowDownloadModal(false);
      setIsInitializing(false);
      
      let errorMessage = 'Failed to download model. ';
      if (error.message.includes('Network') || error.message.includes('network')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error.message.includes('space')) {
        errorMessage += 'Insufficient storage space.';
      } else if (error.message.includes('404')) {
        errorMessage += 'Model file not found. The download link may be outdated.';
      } else {
        errorMessage += error.message;
      }
      
      Alert.alert('Download Error', errorMessage);
    } finally {
      setDownloadProgress(0);
      setDownloadSpeed(0);
      setIsPaused(false);
    }
  };

  const pauseDownload = async () => {
    const result = await modelDownloader.current.pauseDownload();
    if (result.success) {
      setIsPaused(true);
      Alert.alert('Download Paused', 'You can resume the download anytime.');
    } else {
      Alert.alert('Error', result.error || 'Failed to pause download');
    }
  };

  const resumeDownload = async () => {
    setIsPaused(false);
    const result = await modelDownloader.current.resumeDownload((progressData) => {
      setDownloadProgress(progressData.progress);
      setDownloadSpeed(progressData.speed);
    });
    
    if (result.success) {
      Alert.alert('Success', 'Model downloaded successfully!');
      await initializeModel();
      setIsInitializing(false);
    } else if (!result.error.includes('No paused')) {
      Alert.alert('Error', result.error || 'Failed to resume download');
      setIsInitializing(false);
    }
  };

  const cancelDownload = () => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel? You will lose all progress.',
      [
        { text: 'Continue Download', style: 'cancel' },
        {
          text: 'Cancel Download',
          style: 'destructive',
          onPress: async () => {
            const result = await modelDownloader.current.cancelDownload();
            if (result.success) {
              setIsInitializing(false);
              setDownloadProgress(0);
              setDownloadSpeed(0);
              setIsPaused(false);
              setShowDownloadModal(false);
              Alert.alert('Cancelled', 'Download has been cancelled.');
            } else {
              Alert.alert('Error', 'Failed to cancel download');
            }
          },
        },
      ]
    );
  };

  const initializeModel = async () => {
    setIsInitializing(true);
    try {
      const modelPath = `${FileSystem.documentDirectory}mistral-7b-instruct-q4.gguf`;
      
      // Load the model using AIService
      const result = await aiService.current.loadLocalModel(modelPath);
      
      if (result.success) {
        setModelLoaded(true);
        setModelInitialized(true);
        setShowWelcome(false);
        Alert.alert('Success', 'Model loaded successfully! You can now use offline AI.');
      } else {
        throw new Error(result.error || 'Failed to load model');
      }
    } catch (error) {
      console.error('Model initialization error:', error);
      setModelInitialized(false);
      Alert.alert(
        'Error Loading Model', 
        `${error.message}\n\nTry:\n• Restarting the app\n• Re-downloading the model\n• Closing other apps to free memory`
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Check if in offline mode but model not initialized
    if (aiMode === 'offline' && !modelInitialized) {
      Alert.alert(
        'Model Not Ready',
        'The offline model is still loading. Please wait a moment or switch to online mode.',
        [
          { text: 'Wait', style: 'cancel' },
          { 
            text: 'Use Online', 
            onPress: () => {
              setAiMode('online');
              saveSettings('online', apiKey);
            }
          }
        ]
      );
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Create a placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString(),
      mode: aiMode,
    };

    // Add empty AI message immediately
    const messagesWithPlaceholder = [...updatedMessages, aiMessage];
    setMessages(messagesWithPlaceholder);

    try {
      // Use AI Service to generate response with streaming
      const result = await aiService.current.generateResponse(
        updatedMessages,
        (chunk) => {
          // Update the AI message in real-time as chunks arrive
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.id === aiMessageId) {
              lastMsg.text += chunk;
            }
            return newMessages;
          });
        }
      );
      
      // Update with final text (in case streaming didn't work)
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.id === aiMessageId) {
          lastMsg.text = result.text;
          lastMsg.mode = result.mode;
        }
        return newMessages;
      });

      // Save final messages
      await saveMessages(messagesWithPlaceholder.map(msg => 
        msg.id === aiMessageId ? { ...msg, text: result.text, mode: result.mode } : msg
      ));
      
      // Show warning if in demo mode
      if (result.mode === 'demo' || result.mode === 'offline-demo') {
        Alert.alert(
          'Demo Mode',
          result.error || 'Add an API key in settings for real AI responses.',
          [
            { text: 'Later' },
            { text: 'Settings', onPress: () => setShowSettings(true) }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to generate response. Please check your settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildPrompt = (messageHistory) => {
    let prompt = '<s>[INST] ';
    
    messageHistory.forEach((msg, index) => {
      if (msg.sender === 'user') {
        if (index > 0) prompt += '[INST] ';
        prompt += msg.text + ' [/INST]';
      } else {
        prompt += ' ' + msg.text + '</s>';
      }
    });
    
    return prompt;
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await AsyncStorage.removeItem('chat_messages');
          },
        },
      ]
    );
  };

  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.aiMessage,
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
    );
  };

  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar style="light" hidden={true} />
        <View style={styles.welcomeContainer}>
          <Ionicons name="phone-portrait-outline" size={80} color="#007AFF" />
          <Text style={styles.welcomeTitle}>Dual AI Native</Text>
          <Text style={styles.welcomeSubtitle}>
            Run AI completely on your phone
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>100% Private - No Internet Required</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={24} color="#FF9800" />
              <Text style={styles.featureText}>Fast Local Processing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="phone-portrait" size={24} color="#2196F3" />
              <Text style={styles.featureText}>Works Offline</Text>
            </View>
          </View>

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Requirements:</Text>
            <Text style={styles.requirementsText}>• 6GB+ free storage</Text>
            <Text style={styles.requirementsText}>• 4GB+ RAM recommended</Text>
            <Text style={styles.requirementsText}>• WiFi for initial download</Text>
            <Text style={styles.requirementsText}>• Modern phone (2020+)</Text>
          </View>

          {isInitializing ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.downloadingText}>
                {isPaused 
                  ? 'Download Paused' 
                  : downloadProgress > 0 
                    ? `Downloading... ${(downloadProgress * 100).toFixed(1)}%`
                    : 'Initializing...'}
              </Text>
              {downloadProgress > 0 && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
                </View>
              )}
              {downloadProgress > 0 && (
                <>
                  <Text style={styles.downloadDetails}>
                    {(downloadProgress * 4.08).toFixed(2)} GB / 4.08 GB
                  </Text>
                  {downloadSpeed > 0 && !isPaused && (
                    <Text style={styles.downloadSpeed}>
                      {modelDownloader.current.formatSpeed(downloadSpeed)}
                    </Text>
                  )}
                </>
              )}
              
              {downloadProgress > 0 && (
                <View style={styles.downloadControlsContainer}>
                  {isPaused ? (
                    <TouchableOpacity
                      style={[styles.downloadControlButton, styles.resumeButton]}
                      onPress={resumeDownload}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                      <Text style={styles.downloadControlText}>Resume</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.downloadControlButton, styles.pauseButton]}
                      onPress={pauseDownload}
                    >
                      <Ionicons name="pause" size={20} color="#fff" />
                      <Text style={styles.downloadControlText}>Pause</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.downloadControlButton, styles.cancelButton]}
                    onPress={cancelDownload}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.downloadControlText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadModel}
              >
                <Ionicons name="download" size={24} color="#fff" />
                <Text style={styles.downloadButtonText}>Download Model (~4GB)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  setShowWelcome(false);
                  setAiMode('online');
                  saveSettings('online', apiKey);
                }}
              >
                <Text style={styles.skipButtonText}>Skip - Use Online Mode</Text>
              </TouchableOpacity>

              {modelLoaded && (
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => setShowWelcome(false)}
                >
                  <Text style={styles.continueButtonText}>Continue to Chat</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => Alert.alert(
              'About',
              'This app supports dual AI modes:\n\n• Online: Llama 3.3 70B (via Groq API)\n• Offline: Mistral 7B Instruct v0.2 (local on-device)\n\nOffline mode runs entirely on your phone using llama.cpp - no data sent to external servers.'
            )}
          >
            <Text style={styles.infoButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={true} />
      
      {/* Model Initialization Loading Screen */}
      {isInitializing && (
        <View style={styles.initializingOverlay}>
          <View style={styles.initializingContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.initializingTitle}>Loading AI Model</Text>
            <Text style={styles.initializingText}>
              Initializing Mistral 7B into memory...
            </Text>
            <Text style={styles.initializingSubtext}>
              This may take 30-60 seconds{'\n'}
              Please keep the app open
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="phone-portrait" size={20} color="#4CAF50" />
            <Text style={styles.headerTitle}>Dual AI</Text>
            <View style={[styles.modeBadge, { backgroundColor: aiMode === 'online' ? '#2196F3' : '#4CAF50' }]}>
              <Text style={styles.modeText}>{aiMode === 'online' ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={() => setShowChatHistory(true)} style={styles.headerButton}>
              <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#666" />
              <Text style={styles.emptyStateText}>
                Start chatting with your local AI
              </Text>
              <Text style={styles.emptyStateSubtext}>
                No internet required • Completely private
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
          {isLoading && (
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.thinkingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              isInitializing 
                ? "Loading AI model..." 
                : aiMode === 'offline' && !modelInitialized 
                  ? "Model loading..."
                  : "Type your message..."
            }
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
            editable={!isLoading && !isInitializing && (aiMode === 'online' || modelInitialized)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading || isInitializing || (aiMode === 'offline' && !modelInitialized)) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading || isInitializing || (aiMode === 'offline' && !modelInitialized)}
          >
            <Ionicons
              name={isLoading ? 'hourglass-outline' : 'send'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsModalContainer}>
          <SafeAreaView style={styles.settingsModal} edges={['top', 'bottom']}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              {/* AI Mode Selection */}
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>AI Mode</Text>
                
                <TouchableOpacity
                  style={[styles.modeOption, aiMode === 'online' && styles.modeOptionActive]}
                  onPress={() => {
                    setAiMode('online');
                    saveSettings('online', apiKey);
                  }}
                >
                  <View style={styles.modeOptionLeft}>
                    <Ionicons name="cloud" size={24} color={aiMode === 'online' ? '#2196F3' : '#999'} />
                    <View style={styles.modeOptionText}>
                      <Text style={[styles.modeOptionTitle, aiMode === 'online' && styles.modeOptionTitleActive]}>
                        Online Mode
                      </Text>
                      <Text style={styles.modeOptionDesc}>
                        Uses Groq API (requires internet & API key)
                      </Text>
                    </View>
                  </View>
                  {aiMode === 'online' && <Ionicons name="checkmark-circle" size={24} color="#2196F3" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeOption, aiMode === 'offline' && styles.modeOptionActive]}
                  onPress={async () => {
                    if (!modelLoaded) {
                      Alert.alert('Model Not Downloaded', 'Please download the model first to use offline mode.');
                      return;
                    }
                    
                    // Check if model is loaded in memory
                    if (!aiService.current.llamaContext) {
                      // Model file exists but not loaded into memory
                      Alert.alert(
                        'Initialize Model',
                        'The model file is downloaded but needs to be loaded into memory. This may take 30-60 seconds.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Initialize',
                            onPress: async () => {
                              await initializeModel();
                              setAiMode('offline');
                              saveSettings('offline', apiKey);
                            }
                          }
                        ]
                      );
                      return;
                    }
                    
                    setAiMode('offline');
                    saveSettings('offline', apiKey);
                  }}
                >
                  <View style={styles.modeOptionLeft}>
                    <Ionicons name="phone-portrait" size={24} color={aiMode === 'offline' ? '#4CAF50' : '#999'} />
                    <View style={styles.modeOptionText}>
                      <Text style={[styles.modeOptionTitle, aiMode === 'offline' && styles.modeOptionTitleActive]}>
                        Offline Mode
                      </Text>
                      <Text style={styles.modeOptionDesc}>
                        {modelLoaded ? 'Uses local model (no internet needed)' : 'Requires model download'}
                      </Text>
                    </View>
                  </View>
                  {aiMode === 'offline' && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                </TouchableOpacity>
              </View>

              {/* API Key for Online Mode */}
              {aiMode === 'online' && (
                <View style={styles.settingSection}>
                  <Text style={styles.sectionTitle}>Groq API Key</Text>
                  <Text style={styles.sectionDesc}>
                    Get a free API key from console.groq.com
                  </Text>
                  <TextInput
                    style={styles.apiKeyInput}
                    value={apiKey}
                    onChangeText={(text) => {
                      setApiKey(text);
                      saveSettings(aiMode, text);
                    }}
                    placeholder="Enter your API key..."
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {!apiKey && (
                    <Text style={styles.warningText}>
                      ⚠️ No API key set. Demo responses will be shown.
                    </Text>
                  )}
                </View>
              )}

              {/* Model Status */}
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Local Model Status</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={[styles.statusValue, { color: modelLoaded ? '#4CAF50' : '#999' }]}>
                    {modelLoaded ? '✓ Downloaded' : '✗ Not Downloaded'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Model:</Text>
                  <Text style={styles.statusValue}>Mistral 7B Instruct v0.2 (Q4)</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Size:</Text>
                  <Text style={styles.statusValue}>4.08 GB</Text>
                </View>
                {!modelLoaded ? (
                  <>
                    <Text style={styles.infoText}>
                      Download the model to use offline mode. The model runs entirely on your device.
                    </Text>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={downloadModel}
                    >
                      <Ionicons name="download" size={20} color="#fff" />
                      <Text style={styles.downloadButtonText}>Download Model</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.modelActions}>
                    <TouchableOpacity
                      style={styles.redownloadButton}
                      onPress={() => {
                        Alert.alert(
                          'Re-download Model',
                          'This will delete the existing model and download it again. Continue?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Re-download',
                              onPress: async () => {
                                await deleteModel();
                                setTimeout(() => downloadModel(), 500);
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="refresh" size={20} color="#2196F3" />
                      <Text style={styles.redownloadButtonText}>Re-download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={deleteModel}
                    >
                      <Ionicons name="trash" size={20} color="#f44336" />
                      <Text style={styles.deleteButtonText}>Delete Model</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* About Section */}
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.aboutText}>
                  This app can run in two modes:{'\n\n'}
                  
                  <Text style={{ fontWeight: 'bold', color: '#2196F3' }}>Online Mode:</Text>{'\n'}
                  • Uses Groq's fast API{'\n'}
                  • Requires internet connection{'\n'}
                  • Free with API key{'\n'}
                  • Instant responses{'\n\n'}
                  
                  <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>Offline Mode:</Text>{'\n'}
                  • Runs Mistral 7B Instruct v0.2 locally{'\n'}
                  • No internet needed{'\n'}
                  • Complete privacy{'\n'}
                  • Requires model download (4.08 GB){'\n'}
                  • Note: Requires native modules (full build)
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Chat History Modal */}
      <Modal
        visible={showChatHistory}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChatHistory(false)}
      >
        <SafeAreaView style={[styles.container, { paddingTop: 0 }]}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setShowChatHistory(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Chat History</Text>
            <TouchableOpacity onPress={createNewChat} style={styles.newChatButton}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatHistoryList}>
            {chatSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#666" />
                <Text style={styles.emptyStateText}>No chat history yet</Text>
                <Text style={styles.emptyStateSubtext}>Start a conversation to see it here</Text>
              </View>
            ) : (
              chatSessions.map((session) => (
                <View key={session.id} style={styles.chatSessionItem}>
                  <TouchableOpacity
                    style={[
                      styles.chatSessionContent,
                      session.id === currentSessionId && styles.chatSessionActive
                    ]}
                    onPress={() => loadChatSession(session.id)}
                  >
                    <View style={styles.chatSessionInfo}>
                      <Text style={styles.chatSessionTitle} numberOfLines={1}>
                        {session.title || 'New Chat'}
                      </Text>
                      <Text style={styles.chatSessionDate}>
                        {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.chatSessionMessages}>
                        {session.messages?.length || 0} messages
                      </Text>
                    </View>
                    {session.id === currentSessionId && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteSessionButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Chat',
                        'Are you sure you want to delete this conversation?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteChatSession(session.id)
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Download Progress Modal */}
      <Modal
        visible={showDownloadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.downloadModalOverlay}>
          <View style={styles.downloadModalContent}>
            <View style={styles.downloadModalHeader}>
              <Ionicons name="download" size={32} color="#4CAF50" />
              <Text style={styles.downloadModalTitle}>Downloading Model</Text>
            </View>

            <View style={styles.downloadProgressSection}>
              {/* Spinning wheel */}
              <ActivityIndicator size="large" color="#4CAF50" style={{marginBottom: 20}} />
              
              {/* Progress percentage */}
              <Text style={styles.downloadPercentage}>
                {(downloadProgress * 100).toFixed(1)}%
              </Text>

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
              </View>

              {/* Download stats */}
              <View style={styles.downloadStats}>
                <View style={styles.downloadStatItem}>
                  <Text style={styles.downloadStatLabel}>Downloaded:</Text>
                  <Text style={styles.downloadStatValue}>
                    {modelDownloader.current.formatBytes(downloadProgress * 4.08 * 1024 * 1024 * 1024)}
                  </Text>
                </View>
                <View style={styles.downloadStatItem}>
                  <Text style={styles.downloadStatLabel}>Total Size:</Text>
                  <Text style={styles.downloadStatValue}>4.08 GB</Text>
                </View>
                <View style={styles.downloadStatItem}>
                  <Text style={styles.downloadStatLabel}>Remaining:</Text>
                  <Text style={styles.downloadStatValue}>
                    {modelDownloader.current.formatBytes((1 - downloadProgress) * 4.08 * 1024 * 1024 * 1024)}
                  </Text>
                </View>
                <View style={styles.downloadStatItem}>
                  <Text style={styles.downloadStatLabel}>Speed:</Text>
                  <Text style={styles.downloadStatValue}>
                    {modelDownloader.current.formatSpeed(downloadSpeed)}
                  </Text>
                </View>
              </View>

              {/* Estimated time remaining */}
              {downloadSpeed > 0 && downloadProgress > 0.01 && (
                <Text style={styles.downloadETA}>
                  Est. time remaining: {Math.ceil(((1 - downloadProgress) * 4.08 * 1024 * 1024 * 1024) / downloadSpeed / 60)} min
                </Text>
              )}
            </View>

            {/* Cancel button */}
            <TouchableOpacity
              style={styles.cancelDownloadButton}
              onPress={cancelDownload}
            >
              <Ionicons name="close-circle" size={20} color="#f44336" />
              <Text style={styles.cancelDownloadButtonText}>Cancel Download</Text>
            </TouchableOpacity>

            <Text style={styles.downloadModalNote}>
              Keep the app open and your phone connected to WiFi for best results.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  headerWrapper: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  featuresList: {
    marginTop: 40,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
  },
  requirementsBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  requirementsText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 6,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
    width: '100%',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  downloadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  downloadDetails: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  downloadSpeed: {
    color: '#007AFF',
    fontSize: 13,
    marginTop: 4,
  },
  downloadControlsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
    justifyContent: 'center',
  },
  downloadControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  downloadControlText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    marginTop: 24,
  },
  infoButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  modeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  offlineBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 4,
    opacity: 0.7,
  },
  thinkingText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  // Settings Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'flex-end',
  },
  settingsModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  settingsModal: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  modeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2a3a',
  },
  modeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modeOptionText: {
    flex: 1,
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modeOptionTitleActive: {
    color: '#007AFF',
  },
  modeOptionDesc: {
    fontSize: 13,
    color: '#999',
  },
  apiKeyInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 13,
    marginTop: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#999',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  skipButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modelActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  redownloadButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  redownloadButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  newChatButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHistoryList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  chatSessionItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  chatSessionContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatSessionActive: {
    backgroundColor: '#1a3a2a',
  },
  chatSessionInfo: {
    flex: 1,
  },
  chatSessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  chatSessionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  chatSessionMessages: {
    fontSize: 12,
    color: '#666',
  },
  deleteSessionButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 1,
    borderLeftColor: '#333',
  },
  downloadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  downloadModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  downloadModalHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  downloadModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  downloadProgressSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  downloadPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  downloadStats: {
    width: '100%',
    gap: 12,
  },
  downloadStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadStatLabel: {
    fontSize: 14,
    color: '#999',
  },
  downloadStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  downloadETA: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 16,
    textAlign: 'center',
  },
  cancelDownloadButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    marginBottom: 16,
  },
  cancelDownloadButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadModalNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  initializingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initializingContent: {
    alignItems: 'center',
    padding: 40,
  },
  initializingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 12,
  },
  initializingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  initializingSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

