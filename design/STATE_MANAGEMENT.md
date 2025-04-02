# State Management Documentation

## Overview

The application uses a combination of React Hooks for local state management and Electron's IPC system for global state management. This document outlines the state management strategy and implementation details.

## State Types

### 1. Local Component State

#### React Hooks Usage
```typescript
// Example of local state in components
const [isModalOpen, setIsModalOpen] = useState(false);
const [downloadProgress, setDownloadProgress] = useState(0);
const [selectedFormat, setSelectedFormat] = useState('best');
```

#### State Dependencies
- UI state (modals, dropdowns, tooltips)
- Form inputs
- Component-specific data
- Temporary calculations

### 2. Global Application State

#### Electron Store
```typescript
// Settings storage
interface AppSettings {
  downloadPath: string;
  cookieSource: string;
  format: string;
  quality: string;
  autoUpdate: boolean;
}
```

#### IPC Communication
```typescript
// Main process
ipcMain.handle('get-settings', async () => {
  return store.get('settings');
});

// Renderer process
const settings = await ipcRenderer.invoke('get-settings');
```

## State Management Patterns

### 1. Download Queue Management

#### State Structure
```typescript
interface DownloadTask {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed: string;
  size: string;
  format: string;
  quality: string;
  startTime: Date;
  endTime?: Date;
}
```

#### State Updates
- Task creation
- Progress updates
- Status changes
- Task completion
- Error handling

### 2. Settings Management

#### State Structure
```typescript
interface Settings {
  downloadPath: string;
  cookieSource: string;
  format: string;
  quality: string;
  autoUpdate: boolean;
  lastUpdate: Date;
}
```

#### State Persistence
- Settings saved to electron-store
- Automatic loading on startup
- Real-time updates
- Validation before saving

### 3. Application State

#### State Structure
```typescript
interface AppState {
  isOnline: boolean;
  isUpdating: boolean;
  activeDownloads: number;
  totalDownloads: number;
  lastError?: string;
}
```

#### State Updates
- Network status
- Update status
- Download statistics
- Error tracking

## State Synchronization

### 1. Main Process to Renderer

```typescript
// Main process
ipcMain.on('download-progress', (event, data) => {
  event.sender.send('download-update', data);
});

// Renderer process
useEffect(() => {
  const unsubscribe = ipcRenderer.on('download-update', (data) => {
    // Update local state
  });
  return () => unsubscribe();
}, []);
```

### 2. Component to Component

```typescript
// Parent component
const [downloads, setDownloads] = useState([]);

// Child component
const handleProgress = (id, progress) => {
  setDownloads(prev => prev.map(d => 
    d.id === id ? { ...d, progress } : d
  ));
};
```

## State Recovery

### 1. Application Crash Recovery

```typescript
// Main process
app.on('ready', async () => {
  const downloads = await store.get('active-downloads');
  if (downloads?.length) {
    // Resume pending downloads
  }
});
```

### 2. Network Recovery

```typescript
// Network status handling
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

## State Validation

### 1. Input Validation

```typescript
const validateSettings = (settings: Settings): boolean => {
  if (!settings.downloadPath) return false;
  if (!settings.format) return false;
  return true;
};
```

### 2. State Constraints

```typescript
const updateProgress = (progress: number) => {
  // Ensure progress is between 0 and 100
  const validProgress = Math.max(0, Math.min(100, progress));
  setProgress(validProgress);
};
```

## Performance Considerations

### 1. State Updates Optimization

```typescript
// Batch updates
const updateMultipleDownloads = (updates: DownloadUpdate[]) => {
  setDownloads(prev => {
    const newDownloads = [...prev];
    updates.forEach(update => {
      const index = newDownloads.findIndex(d => d.id === update.id);
      if (index !== -1) {
        newDownloads[index] = { ...newDownloads[index], ...update };
      }
    });
    return newDownloads;
  });
};
```

### 2. Memory Management

```typescript
// Cleanup completed downloads
const cleanupCompletedDownloads = () => {
  setDownloads(prev => prev.filter(d => d.status !== 'completed'));
};
```

## Testing Strategy

### 1. State Tests

```typescript
describe('Download State Management', () => {
  it('should update progress correctly', () => {
    const { result } = renderHook(() => useDownloadState());
    act(() => {
      result.current.updateProgress('123', 50);
    });
    expect(result.current.getProgress('123')).toBe(50);
  });
});
```

### 2. Integration Tests

```typescript
describe('Settings Integration', () => {
  it('should persist settings changes', async () => {
    const settings = { downloadPath: '/test' };
    await ipcRenderer.invoke('save-settings', settings);
    const saved = await ipcRenderer.invoke('get-settings');
    expect(saved.downloadPath).toBe('/test');
  });
});
``` 