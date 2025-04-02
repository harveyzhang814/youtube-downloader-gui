# API Integration Documentation

## Overview

This document outlines the API integrations and external service interactions in the YouTube Downloader GUI application.

## YouTube Data API

### 1. Video Information Fetching

```typescript
interface VideoInfo {
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  formats: VideoFormat[];
  subtitles: SubtitleTrack[];
}

interface VideoFormat {
  format_id: string;
  ext: string;
  quality: string;
  filesize: number;
  format: string;
  vcodec: string;
  acodec: string;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('get-video-info', async (event, url) => {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      description: info.videoDetails.description,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails[0].url,
      formats: info.formats,
      subtitles: info.subtitles
    };
  } catch (error) {
    throw new Error('Failed to fetch video information');
  }
});
```

### 2. Download Management

#### Download Options
```typescript
interface DownloadOptions {
  url: string;
  format: string;
  quality: string;
  output: string;
  cookies?: string;
  subtitles?: string[];
  audioFormat?: string;
  audioQuality?: string;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('start-download', async (event, options) => {
  const download = new Download(options);
  download.on('progress', (progress) => {
    event.sender.send('download-progress', {
      id: download.id,
      progress: progress.percent,
      speed: progress.speed,
      size: progress.size
    });
  });
  return download.start();
});
```

## Browser Cookie Integration

### 1. Cookie Extraction

```typescript
interface CookieSource {
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'brave';
  profile?: string;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('get-cookies', async (event, source: CookieSource) => {
  const browser = getBrowser(source.browser);
  const cookies = await browser.getCookies('youtube.com');
  return cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path
  }));
});
```

## File System Integration

### 1. Download Location Management

```typescript
interface FileSystem {
  getDownloadPath(): Promise<string>;
  setDownloadPath(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  checkPermissions(path: string): Promise<boolean>;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('select-download-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled) {
    await store.set('downloadPath', result.filePaths[0]);
  }
  return result.filePaths[0];
});
```

### 2. File Operations

```typescript
interface FileOperations {
  openFile(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('open-file', async (event, path) => {
  try {
    await shell.openPath(path);
  } catch (error) {
    throw new Error('Failed to open file');
  }
});
```

## System Integration

### 1. Notifications

```typescript
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('show-notification', async (event, options) => {
  const notification = new Notification(options);
  notification.show();
});
```

### 2. System Preferences

```typescript
interface SystemPreferences {
  getTheme(): Promise<'light' | 'dark'>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  getLanguage(): Promise<string>;
  setLanguage(language: string): Promise<void>;
}
```

#### Implementation
```typescript
// Main process
ipcMain.handle('get-system-preferences', async () => {
  return {
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    language: app.getLocale()
  };
});
```

## Error Handling

### 1. API Errors

```typescript
interface APIError extends Error {
  code: string;
  status: number;
  details?: any;
}
```

#### Implementation
```typescript
// Error handling middleware
const handleAPIError = (error: APIError) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network connection error';
    case 'INVALID_URL':
      return 'Invalid YouTube URL';
    case 'PRIVATE_VIDEO':
      return 'This video is private';
    default:
      return 'An unexpected error occurred';
  }
};
```

### 2. System Errors

```typescript
interface SystemError extends Error {
  code: string;
  path?: string;
  permission?: string;
}
```

#### Implementation
```typescript
// System error handling
const handleSystemError = (error: SystemError) => {
  switch (error.code) {
    case 'EACCES':
      return 'Permission denied';
    case 'ENOENT':
      return 'File or directory not found';
    case 'EEXIST':
      return 'File already exists';
    default:
      return 'System error occurred';
  }
};
```

## Security Considerations

### 1. API Authentication

```typescript
interface APICredentials {
  apiKey: string;
  clientId: string;
  clientSecret: string;
}
```

#### Implementation
```typescript
// Secure credential storage
const storeCredentials = async (credentials: APICredentials) => {
  const encrypted = await encrypt(credentials);
  await store.set('apiCredentials', encrypted);
};
```

### 2. Data Validation

```typescript
// Input validation
const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return url.includes('youtube.com') || url.includes('youtu.be');
  } catch {
    return false;
  }
};
```

## Performance Optimization

### 1. Request Caching

```typescript
interface CacheOptions {
  ttl: number;
  maxSize: number;
}
```

#### Implementation
```typescript
// Cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

const getCachedData = async (key: string, fetchFn: () => Promise<any>) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

### 2. Rate Limiting

```typescript
interface RateLimit {
  requests: number;
  window: number;
}
```

#### Implementation
```typescript
// Rate limiting implementation
const rateLimiter = new RateLimiter({
  requests: 100,
  window: 60000 // 1 minute
});

const makeRequest = async () => {
  await rateLimiter.waitForToken();
  // Make API request
};
``` 