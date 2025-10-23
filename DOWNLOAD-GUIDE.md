# Model Download Guide

## Automatic Download Feature

The app now includes a **fully integrated model downloader** that handles:

✅ **Direct Download** from Hugging Face
✅ **Progress Tracking** with real-time percentage and speed
✅ **Storage Validation** checks available space before download
✅ **Resume Support** for interrupted downloads
✅ **Error Handling** with helpful messages
✅ **Mirror Fallback** tries alternative servers if primary fails

## How It Works

### 1. **Tap "Download Model"** in the app
- The app checks available storage (needs ~5GB free)
- Shows confirmation dialog with estimated download time

### 2. **Download Progress**
- Real-time progress bar (0-100%)
- Download speed (MB/s)
- Amount downloaded / Total size
- Typical download time: 10-30 minutes on WiFi

### 3. **After Download**
- Model is saved to app's private storage
- File is verified for correct size
- Model is ready to use offline

## Download Specifications

- **Model**: Mistral-7B-Instruct-v0.2 (Q4_K_M quantization)
- **Size**: ~4.08 GB
- **Format**: GGUF (optimized for mobile)
- **Source**: Hugging Face (TheBloke)
- **Storage Required**: 5+ GB free space recommended

## Technical Details

### Download Manager Features

```javascript
ModelDownloader {
  - checkStorageSpace()      // Validates available storage
  - downloadModel()           // Downloads with progress tracking
  - pauseDownload()          // Pause active download
  - resumeDownload()         // Resume paused download
  - cancelDownload()         // Cancel and cleanup
  - formatSpeed()            // Display friendly speed (MB/s)
  - formatBytes()            // Display friendly sizes (GB/MB/KB)
}
```

### Error Handling

The downloader handles:
- ❌ Network interruptions → Suggests retry
- ❌ Insufficient storage → Shows required vs available
- ❌ 404 errors → Tries mirror server
- ❌ Corrupted downloads → Validates file size
- ❌ Already exists → Asks if user wants to re-download

### Resume Support

If download is interrupted:
1. App stores download state
2. Can resume from last position
3. Doesn't re-download completed portions
4. Saves bandwidth and time

## Alternative: Manual Download

If automatic download doesn't work, you can manually transfer the model:

### Android (via ADB)

```bash
# 1. Download model from Hugging Face
# https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/blob/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf

# 2. Connect phone via USB with debugging enabled
adb devices

# 3. Push file to phone
adb push mistral-7b-instruct-v0.2.Q4_K_M.gguf /sdcard/Download/

# 4. In app, use "Load from device" option
```

### iOS (via Files App)

1. Download model to your computer
2. Use AirDrop or iTunes File Sharing
3. Place in app's Documents folder
4. App will detect it automatically

## Troubleshooting

### Download Fails Immediately
- **Check WiFi connection** (cellular not recommended)
- **Verify storage space** (need 5+ GB free)
- **Try mirror server** (app will prompt automatically)

### Download Stops Midway
- **App automatically resumes** if connection restored
- **Manual resume**: Tap "Download Model" again
- **Check battery**: Phone may have entered sleep mode

### "Insufficient Storage" Error
- **Free up space**: Delete unused apps/files
- **Need**: 5 GB free minimum
- **Recommended**: 6-7 GB for safety

### Model Downloaded but Won't Load
- **File corruption**: Re-download (app will prompt)
- **Incomplete download**: Check file size (~4.08 GB)
- **Clear cache**: Restart app

## Download Sources

### Primary (Hugging Face)
```
https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

### Alternative Sources
You can modify `ModelDownloader.js` to add:
- Your own CDN/server
- Local network server
- Cloud storage (Dropbox, Google Drive with direct links)

## Performance Tips

### Faster Downloads
- ✅ Use WiFi (5GHz preferred)
- ✅ Close other apps using network
- ✅ Keep screen on during download
- ✅ Plug into power (prevents sleep mode)

### Storage Optimization
- Model uses ~4 GB
- Runtime uses ~1-2 GB
- Keep 2-3 GB extra free for safety
- Total recommended: 8+ GB free

## API Integration

For developers wanting to integrate the downloader:

```javascript
import ModelDownloader from './ModelDownloader';

const downloader = new ModelDownloader();

// Check storage
const storage = await downloader.checkStorageSpace();
if (storage.hasSpace) {
  // Start download
  const result = await downloader.downloadModel((progress) => {
    console.log(`Progress: ${(progress.progress * 100).toFixed(1)}%`);
    console.log(`Speed: ${downloader.formatSpeed(progress.speed)}`);
  });
  
  if (result.success) {
    console.log('Model ready at:', result.path);
  }
}
```

## Security & Privacy

- ✅ **Direct connection** to Hugging Face (no intermediary servers)
- ✅ **File verification** checks size and integrity
- ✅ **Private storage** model stored in app-only directory
- ✅ **No tracking** no analytics or telemetry
- ✅ **Offline capable** after download, works without internet

---

**Need Help?** Check the main README.md or open an issue on GitHub.
