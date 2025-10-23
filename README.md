# Mistral AI Native Mobile - 100% On-Device

A fully native mobile app that runs Mistral 7B AI **completely on your phone** - no internet or PC required!

## 🎯 Key Features

✅ **100% On-Device** - Model runs entirely on your phone
✅ **No Internet Required** - Works completely offline after setup
✅ **Private** - All data stays on your device
✅ **No PC Needed** - Standalone mobile application
✅ **Fast** - Optimized for mobile hardware

## 📱 Requirements

### Device Requirements
- **Storage**: 6GB+ free space (4GB for model)
- **RAM**: 4GB+ recommended (6GB+ ideal)
- **Processor**: Modern ARM processor (2020+ devices)
- **OS**: iOS 14+ or Android 8+

### Recommended Devices
**Android:**
- Samsung Galaxy S20+ or newer
- Google Pixel 5 or newer
- OnePlus 8 or newer
- Any flagship device from 2020+

**iOS:**
- iPhone 11 or newer
- iPad Pro (2020+)
- iPad Air (2020+)

## 🚀 Installation

### Option 1: Development Mode (Expo)

1. **Install Dependencies**
```powershell
cd native-mobile
npm install
```

2. **Start Development Server**
```powershell
npm start
```

3. **Run on Device**
- Install Expo Go on your phone
- Scan the QR code

### Option 2: Production Build (Standalone App)

**Android:**
```bash
npm install -g eas-cli
eas build --platform android --profile production
```

**iOS (requires Mac + Apple Developer account):**
```bash
eas build --platform ios --profile production
```

## 📥 Setting Up the Model

### Step 1: Download Model

The app uses a quantized version of Mistral 7B (Q4_K_M) which is ~4GB:

**Download from Hugging Face:**
- Go to: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF
- Download: `mistral-7b-instruct-v0.2.Q4_K_M.gguf`

### Step 2: Transfer Model to Phone

**Android (using ADB):**
```bash
# Install ADB from Android SDK
adb devices
adb push mistral-7b-instruct-v0.2.Q4_K_M.gguf /sdcard/Download/
```

Then move it to the app's directory through the app interface.

**iOS:**
Use iTunes File Sharing or the Files app to transfer the model.

### Step 3: Load Model in App

1. Open the app
2. Tap "Download Model"
3. If you already downloaded it, select "Load from device"
4. Navigate to where you saved the model
5. Wait for initialization (30-60 seconds)

## 🛠 Technical Details

### Architecture

```
React Native App
    ↓
React-Native-Llama Bridge
    ↓
llama.cpp (C++)
    ↓
Mistral 7B Model (GGUF format)
    ↓
Your Phone's CPU/GPU
```

### How It Works

1. **llama.cpp**: Efficient C++ implementation for running LLMs
2. **GGUF Format**: Optimized quantized model format (Q4 = 4-bit quantization)
3. **Native Modules**: React Native bridges to C++ for performance
4. **On-Device Inference**: Uses ARM NEON instructions for acceleration

### Performance

**Expected Generation Speed:**
- Flagship phones (2023+): 10-20 tokens/second
- Mid-range phones (2021-2022): 5-10 tokens/second
- Older phones: 2-5 tokens/second

**Memory Usage:**
- Model: ~4GB
- Runtime: ~1-2GB
- Total: ~5-6GB

## ⚡ Optimization Tips

1. **Close Background Apps**: Free up RAM for better performance
2. **Use Lower Context**: Reduce context window for faster responses
3. **Adjust Temperature**: Lower temperature = faster generation
4. **Consider Smaller Models**: Use Mistral-7B-Q2 for less powerful devices

## 🔧 Advanced Configuration

Edit the model parameters in `App.js`:

```javascript
const context = await initLlama({
  model: modelPath,
  n_ctx: 2048,      // Context window (lower = faster)
  n_batch: 512,     // Batch size
  n_threads: 4,     // CPU threads (adjust for your device)
  use_mlock: true,  // Keep model in RAM
});
```

## 🐛 Troubleshooting

### App Crashes on Model Load
- **Solution**: Your device may not have enough RAM. Try:
  - Closing all other apps
  - Restarting your phone
  - Using a smaller quantized model (Q2 or Q3)

### Slow Generation
- **Solution**: 
  - Reduce context window (`n_ctx`)
  - Use fewer threads (`n_threads: 2`)
  - Lower batch size (`n_batch: 256`)

### Model Not Found
- **Solution**: Check file location and permissions. Ensure the model file is in the correct directory.

## 📚 Alternative: Using MLKit (Smaller Models)

For devices with less RAM, consider using smaller models with Google MLKit or Core ML:

**Android (MLKit):**
- Gemini Nano (3GB)
- Phi-2 (2.7B parameters, ~1.5GB)

**iOS (Core ML):**
- Llama-2-7B-Chat (optimized, ~3GB)
- Phi-2 (2.7B, ~1.5GB)

## 🔒 Privacy & Security

✅ **No Telemetry**: No data collection
✅ **No Network**: Works completely offline
✅ **Local Storage**: All chats stored only on device
✅ **No Cloud**: No data sent to servers

## 📖 Building Native Modules

For full production implementation, you'll need to:

1. **Clone llama.cpp**:
```bash
git clone https://github.com/ggerganov/llama.cpp
```

2. **Build React Native Bridge**:
```bash
# See react-native-llama documentation
npm install react-native-llama
cd node_modules/react-native-llama
npm run build:android  # or build:ios
```

3. **Link Native Modules**:
```bash
npx pod-install  # iOS
```

## 🎓 Resources

- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [React Native Llama](https://github.com/jhen0409/react-native-llama)
- [Mistral AI](https://mistral.ai/)
- [Hugging Face GGUF Models](https://huggingface.co/TheBloke)

## ⚠️ Important Notes

1. **Battery Usage**: Running AI models is intensive - expect higher battery drain
2. **Heat**: Your phone will get warm during generation
3. **First Run**: Model loading takes 30-60 seconds initially
4. **Storage**: Keep 2-3GB extra space free for optimal performance

## 🚀 Future Enhancements

- [ ] GPU acceleration (Metal for iOS, Vulkan for Android)
- [ ] Model switching (different Mistral variants)
- [ ] Voice input/output
- [ ] Image generation (Stable Diffusion Mobile)
- [ ] Multi-modal support

---

**Note**: This is a demonstration of the concept. Full implementation requires building native modules with C++ and proper integration with llama.cpp. The current code shows the structure and UI - you'll need to integrate the actual native libraries for production use.

For a simpler alternative, check out the `mobile-app` folder which uses a PC as the backend.
