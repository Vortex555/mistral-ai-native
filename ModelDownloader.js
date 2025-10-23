// Download Manager for Model Files
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

export class ModelDownloader {
  constructor() {
    this.downloadResumable = null;
    this.isPaused = false;
  }

  // Alternative download URLs (in case primary fails)
  static MODEL_URLS = {
    primary: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    mirror1: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    // Add more mirrors as needed
  };

  static MODEL_SIZE = 4.08 * 1024 * 1024 * 1024; // 4.08 GB in bytes

  async checkStorageSpace() {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      const requiredSpace = ModelDownloader.MODEL_SIZE * 1.2; // Add 20% buffer
      
      return {
        hasSpace: freeDiskStorage >= requiredSpace,
        available: freeDiskStorage,
        required: requiredSpace,
      };
    } catch (error) {
      console.error('Error checking storage:', error);
      return { hasSpace: false, available: 0, required: ModelDownloader.MODEL_SIZE };
    }
  }

  async downloadModel(progressCallback, useAlternative = false) {
    const modelUrl = useAlternative ? ModelDownloader.MODEL_URLS.mirror1 : ModelDownloader.MODEL_URLS.primary;
    const modelPath = `${FileSystem.documentDirectory}mistral-7b-instruct-q4.gguf`;

    try {
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (fileInfo.exists) {
        const shouldRedownload = await new Promise((resolve) => {
          Alert.alert(
            'Model Exists',
            'A model file already exists. Do you want to re-download it?',
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Re-download', onPress: () => resolve(true) }
            ]
          );
        });

        if (!shouldRedownload) {
          return { success: false, cancelled: true };
        }

        // Delete existing file
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
      }

      // Create download resumable with progress tracking
      this.downloadResumable = FileSystem.createDownloadResumable(
        modelUrl,
        modelPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const speed = this.calculateSpeed(downloadProgress);
          
          progressCallback({
            progress,
            bytesWritten: downloadProgress.totalBytesWritten,
            totalBytes: downloadProgress.totalBytesExpectedToWrite,
            speed,
          });
        }
      );

      const result = await this.downloadResumable.downloadAsync();

      if (result && result.status === 200) {
        // Verify file size
        const finalFileInfo = await FileSystem.getInfoAsync(modelPath);
        if (finalFileInfo.size > ModelDownloader.MODEL_SIZE * 0.95) {
          return { success: true, path: modelPath };
        } else {
          throw new Error('Downloaded file size is smaller than expected');
        }
      } else {
        throw new Error(`Download failed with status: ${result?.status || 'unknown'}`);
      }

    } catch (error) {
      console.error('Download error:', error);
      
      // If primary URL fails, suggest trying alternative
      if (!useAlternative && error.message.includes('404')) {
        const tryAlternative = await new Promise((resolve) => {
          Alert.alert(
            'Download Failed',
            'Primary download link failed. Try alternative mirror?',
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Try Mirror', onPress: () => resolve(true) }
            ]
          );
        });

        if (tryAlternative) {
          return this.downloadModel(progressCallback, true);
        }
      }

      return { success: false, error: error.message };
    }
  }

  async pauseDownload() {
    if (this.downloadResumable) {
      try {
        await this.downloadResumable.pauseAsync();
        this.isPaused = true;
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No active download' };
  }

  async resumeDownload(progressCallback) {
    if (this.downloadResumable && this.isPaused) {
      try {
        const result = await this.downloadResumable.resumeAsync();
        this.isPaused = false;
        
        if (result && result.status === 200) {
          return { success: true, path: result.uri };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No paused download' };
  }

  async cancelDownload() {
    if (this.downloadResumable) {
      try {
        await this.downloadResumable.cancelAsync();
        this.downloadResumable = null;
        this.isPaused = false;
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No active download' };
  }

  calculateSpeed(downloadProgress) {
    // Initialize speed tracking array if not exists
    if (!this.speedHistory) {
      this.speedHistory = [];
      this.lastProgress = {
        bytes: 0,
        timestamp: Date.now(),
      };
      return 0;
    }

    const now = Date.now();
    const timeDiff = (now - this.lastProgress.timestamp) / 1000; // seconds
    
    // Need at least 0.5 seconds between measurements for accuracy
    if (timeDiff < 0.5) {
      return this.lastSpeed || 0;
    }
    
    const bytesDiff = downloadProgress.totalBytesWritten - this.lastProgress.bytes;
    
    // Calculate current speed (bytes per second)
    let currentSpeed = bytesDiff / timeDiff;
    
    // Filter out invalid speeds
    if (!isFinite(currentSpeed) || currentSpeed < 0 || currentSpeed > 100 * 1024 * 1024) {
      currentSpeed = this.lastSpeed || 0;
    }
    
    // Add to history (keep last 5 measurements for smoothing)
    this.speedHistory.push(currentSpeed);
    if (this.speedHistory.length > 5) {
      this.speedHistory.shift();
    }
    
    // Calculate average speed for smoother display
    const avgSpeed = this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length;
    
    this.lastProgress = {
      bytes: downloadProgress.totalBytesWritten,
      timestamp: now,
    };
    
    this.lastSpeed = avgSpeed;
    return avgSpeed;
  }

  formatSpeed(bytesPerSecond) {
    if (!isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
      return 'Calculating...';
    }
    
    const mbps = bytesPerSecond / (1024 * 1024);
    
    if (mbps < 0.01) {
      const kbps = bytesPerSecond / 1024;
      return `${kbps.toFixed(1)} KB/s`;
    } else if (mbps < 1) {
      return `${mbps.toFixed(2)} MB/s`;
    } else {
      return `${mbps.toFixed(1)} MB/s`;
    }
  }

  formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
}

export default ModelDownloader;
