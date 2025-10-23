# Native iOS Build Guide - Mistral AI App

## 🎯 Overview
This guide will help you build the native iOS app on your Mac with full offline AI support using llama.cpp.

---

## 📋 Prerequisites (Run on Mac)

### 1. Install Xcode
```bash
# Download from App Store or run:
xcode-select --install
```

### 2. Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Install Node.js (if not on Mac yet)
```bash
brew install node
node --version  # Should be v20 or higher
```

### 4. Install CocoaPods
```bash
sudo gem install cocoapods
pod --version
```

### 5. Install Watchman (optional but recommended)
```bash
brew install watchman
```

---

## 🚀 Build Steps

### Step 1: Clone/Transfer Project
If using GitHub:
```bash
cd ~/Documents
git clone <YOUR_GITHUB_URL>
cd native-mobile
```

If using manual transfer (USB/Cloud):
- Copy the entire `native-mobile` folder to your Mac
- Open Terminal and navigate to it

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Install React Native Llama
```bash
npm install @staltz/react-native-llama --legacy-peer-deps
```

### Step 4: Prebuild for iOS
```bash
npx expo prebuild --platform ios
```
This creates the `ios/` folder with the native Xcode project.

### Step 5: Install iOS Dependencies
```bash
cd ios
pod install
cd ..
```

### Step 6: Run on iOS Simulator
```bash
npx expo run:ios
```

Or open in Xcode:
```bash
open ios/nativemobile.xcworkspace
```

---

## 📱 Testing on Real iPhone

### Option 1: Connect iPhone
1. Connect iPhone via USB
2. Trust the computer on your iPhone
3. Run:
```bash
npx expo run:ios --device
```

### Option 2: Build for Distribution
1. Open Xcode workspace
2. Select your device
3. Update Bundle Identifier (to make it unique)
4. Add your Apple Developer account in Xcode
5. Build & Run (⌘R)

---

## 🤖 Setting Up Offline AI

### Model Download Location
The app downloads the model to:
```
iPhone: /Documents/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

### How It Works
1. **First Launch**: Download 4GB model via app (WiFi recommended)
2. **Model Loading**: Llama.cpp loads model into memory
3. **Inference**: Runs completely on device (no internet needed)

### Performance Expectations
- **iPhone 12+**: 5-10 tokens/second
- **iPhone 14+**: 10-15 tokens/second
- **iPhone 15 Pro**: 15-20 tokens/second

---

## 🔧 Troubleshooting

### Build Errors

**Error: "Command PhaseScriptExecution failed"**
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

**Error: "Unable to boot simulator"**
```bash
# Reset simulator
xcrun simctl erase all
```

**Error: "Developer Mode not enabled"**
```bash
# On iPhone: Settings > Privacy & Security > Developer Mode > Enable
# Restart iPhone
```

### Runtime Errors

**Model fails to load**
- Check storage space (need 6GB free minimum)
- Re-download model from app settings
- Check file permissions

**App crashes on inference**
- Model might be corrupted, re-download
- Check device has enough RAM (2GB+ free)
- Try smaller model variant

---

## 📊 Model Variants

If the Q4_K_M model is too slow, try:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| Q2_K | 2.5 GB | Fast | Lower |
| Q4_K_M | 4 GB | Medium | Good ⭐ |
| Q5_K_M | 5 GB | Slow | Better |

Update in `ModelDownloader.js`:
```javascript
const MODEL_URL = 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q2_K.gguf';
```

---

## 🎨 Customization

### Change App Name
1. Open `app.json`
2. Change `"name"` and `"slug"`
3. Run `npx expo prebuild` again

### Change App Icon
1. Replace `assets/icon.png` (1024x1024)
2. Run `npx expo prebuild` again

### Change Bundle ID
1. Open Xcode
2. Select project > Signing & Capabilities
3. Change Bundle Identifier

---

## 📝 Important Notes

### Apple Developer Account
- **Free Account**: Can run on your device for 7 days
- **Paid ($99/year)**: Permanent installation + App Store distribution

### Storage Requirements
- **Development**: ~2GB (Xcode build files)
- **App Size**: ~50MB (without model)
- **Model Storage**: 4GB (downloaded on first run)

### Privacy
- All AI processing happens on-device
- No data sent to external servers (except online mode)
- Model stored locally, never uploaded

---

## 🆘 Need Help?

### Common Commands
```bash
# Clean build
npm run ios:clean
cd ios && pod install && cd ..
npx expo run:ios

# Check device logs
npx react-native log-ios

# Reset Metro bundler
npm start -- --reset-cache
```

### Useful Links
- [Expo Documentation](https://docs.expo.dev)
- [React Native Llama](https://github.com/staltz/react-native-llama)
- [GGUF Models](https://huggingface.co/TheBloke)

---

## ✅ Build Checklist

- [ ] Xcode installed
- [ ] CocoaPods installed
- [ ] Node.js v20+ installed
- [ ] Project transferred to Mac
- [ ] `npm install` completed
- [ ] `react-native-llama` installed
- [ ] `npx expo prebuild` completed
- [ ] `pod install` completed
- [ ] App runs in simulator
- [ ] Model download works
- [ ] Offline AI tested

---

## 🎉 Success!

Once built, you'll have:
- ✅ Dual-mode AI (Online via Groq + Offline via local model)
- ✅ Full privacy with offline mode
- ✅ Native iOS app performance
- ✅ No Expo Go dependency

**Enjoy your native AI chatbot!** 🚀
