# How to Use the Dual-Mode AI App

## Features

Your app now supports **TWO AI modes**:

### 🌐 Online Mode (Works Now!)
- Uses Groq's free API (https://console.groq.com)
- Very fast responses
- Requires internet connection
- Need to sign up for a free API key

### 📱 Offline Mode (Requires Native Build)
- Runs Mistral 7B locally on your phone
- No internet needed after model download
- Complete privacy - data never leaves your device
- Currently shows demo responses (requires native modules)

---

## Quick Start

### 1. Open the App
- Scan the QR code with Expo Go
- The app will start in **Online Mode** by default

### 2. Set Up Online Mode (Recommended for Testing)

1. **Get a Free API Key:**
   - Go to https://console.groq.com
   - Sign up (free account)
   - Create an API key

2. **Add to the App:**
   - Tap the ⚙️ (settings) icon in the top right
   - You'll see two mode options
   - The API key input field will be visible since Online Mode is selected
   - Paste your Groq API key
   - It saves automatically!

3. **Start Chatting:**
   - Go back to chat (tap X on settings)
   - Type your message
   - Get real AI responses instantly!

### 3. Try Offline Mode (Demo Only)

1. **Download the Model:**
   - From the welcome screen, tap "Download Model (4.08 GB)"
   - Or from settings, if you already passed the welcome screen
   - Wait for download (uses pause/resume if needed)

2. **Switch to Offline Mode:**
   - Open settings (⚙️ icon)
   - Tap "Offline Mode"
   - Note: Currently shows demo responses
   - Full offline AI requires building native modules

---

## What Each Mode Shows

### Online Mode
- **With API Key:** Real AI responses from Groq
- **Without API Key:** Demo responses + alert to add key

### Offline Mode  
- **Model Downloaded:** Demo responses (native modules needed for real AI)
- **Model Not Downloaded:** Can't switch to offline mode

---

## Visual Indicators

- **Blue "ONLINE" badge:** Using Groq API
- **Green "OFFLINE" badge:** Using local model
- Badge appears next to app title in the header

---

## Settings Overview

When you open settings (⚙️), you'll see:

1. **AI Mode Selection**
   - Online Mode (cloud icon)
   - Offline Mode (phone icon)
   - Selected mode has checkmark and colored border

2. **API Key Input** (only visible in Online Mode)
   - Enter your Groq API key here
   - Shows warning if empty

3. **Local Model Status**
   - Shows if model is downloaded
   - Shows model size (4.08 GB)
   - Info about offline mode

4. **About Section**
   - Explains both modes
   - Feature comparison

---

## Testing Steps

1. **Test Online Mode:**
   ```
   1. Open app
   2. Go to settings
   3. Add your Groq API key
   4. Close settings
   5. Type "Hello, who are you?"
   6. You should get a real AI response!
   ```

2. **Test Without API Key:**
   ```
   1. Don't add API key (or remove it)
   2. Send a message
   3. You'll get demo response + alert to add key
   ```

3. **Test Mode Switching:**
   ```
   1. Open settings
   2. Switch between Online/Offline
   3. Notice the badge color change in header
   4. Close settings and the badge persists
   ```

4. **Test Model Download:**
   ```
   1. From welcome screen, start download
   2. Watch progress bar and speed
   3. Try pause/resume/cancel buttons
   4. Download completes -> model status updates
   ```

---

## Current Limitations

### Offline Mode
- ⚠️ **Shows demo responses only**
- Needs native modules (llama.cpp integration)
- Requires building with `expo prebuild` and native tooling
- Works in Expo Go for testing UI/UX only

### Online Mode
- ✅ **Fully functional!**
- Just need a free Groq API key
- Works perfectly in Expo Go

---

## Next Steps for Full Offline AI

To make offline mode work with real AI:

1. Build native app (not Expo Go):
   ```bash
   npx expo prebuild
   npx expo run:android
   ```

2. Integrate llama.cpp:
   - Use react-native-llama or similar
   - Load the downloaded GGUF model
   - Connect to AIService.generateOffline()

3. Test on real device with full build

---

## Troubleshooting

### "Demo Mode" Alert Appears
- You need to add your Groq API key in settings
- Or the API key is invalid
- Check https://console.groq.com

### Can't Switch to Offline Mode
- Model needs to be downloaded first
- Tap "Download Model" from welcome screen
- Or dismiss welcome and check settings

### No Response to Messages
- Check you have internet (online mode)
- Check API key is correct
- Try switching modes in settings

### App Crashes on Message Send
- Check terminal for errors
- Reload the app (shake device → Reload)
- Check API key format

---

## API Key Security

- Stored in AsyncStorage (encrypted on device)
- Never shared or logged
- Only sent to Groq API servers
- Can be deleted anytime in settings

---

## Performance

### Online Mode
- Response time: 1-3 seconds
- Depends on internet speed
- Uses Groq's fast infrastructure

### Offline Mode (when fully built)
- Response time: 5-15 seconds (device dependent)
- No internet needed
- Runs on device CPU
- Performance varies by phone

---

## Have Fun!

You now have a working AI chatbot that can use both cloud and local models! 🎉

Start with **Online Mode** for instant results, and explore **Offline Mode** when you're ready to build the full native app.
