# Component Design Documentation

## Core Components

### TitleBar
**Purpose**: Custom window title bar with macOS-style controls
**Props**: None
**Features**:
- Window control buttons (close, minimize, maximize)
- Custom styling for macOS look and feel
- Drag region for window movement

### Toolbar
**Purpose**: Main application toolbar with action buttons
**Props**: None
**Features**:
- New download button
- Settings button
- Pause/Resume all button
- Clear completed button

### DownloadList
**Purpose**: Container for download items
**Props**: None
**Features**:
- List of active and completed downloads
- Empty state handling
- Scrollable container
- Drag and drop support

### DownloadItem
**Purpose**: Individual download task display
**Props**:
```typescript
interface DownloadItemProps {
  id: string;
  title: string;
  url: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  speed: string;
  size: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onOpenFile: () => void;
  onDelete: () => void;
}
```
**Features**:
- Progress bar with percentage
- Download speed and size display
- Status indicators
- Action buttons (pause/resume, cancel, open file location)
- Error handling and display

### NewTaskModal
**Purpose**: Modal for creating new download tasks
**Props**:
```typescript
interface NewTaskModalProps {
  onClose: () => void;
  onSubmit: (task: DownloadTask) => void;
}
```
**Features**:
- URL input with validation
- Format selection (video/audio)
- Quality selection
- Subtitle selection
- Advanced options
- Error handling

### Settings
**Purpose**: Application settings management
**Props**: None
**Features**:
- Download location selection
- Cookie source selection
- Format preferences
- Advanced settings
- Settings persistence

## Component Styling

### Design System

The application uses a consistent design system with the following elements:

1. **Colors**
   - Primary: #0066cc
   - Secondary: #f5f5f7
   - Text: #333333
   - Error: #ff3b30
   - Success: #34c759

2. **Typography**
   - Font Family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
   - Base Size: 13px
   - Headings: 16px, 600 weight

3. **Spacing**
   - Base Unit: 8px
   - Component Padding: 16px
   - Section Spacing: 24px

4. **Borders & Shadows**
   - Border Radius: 6px
   - Border Color: rgba(0,0,0,0.1)
   - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)

### Responsive Design

Components are designed to be responsive with the following breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Component Communication

### State Management

1. **Local State**
   - Component-specific state using React Hooks
   - Form state management
   - UI state (modals, dropdowns)

2. **Global State**
   - Download queue management
   - Application settings
   - System preferences

### Event Handling

1. **User Events**
   - Click handlers
   - Form submissions
   - Drag and drop
   - Keyboard shortcuts

2. **System Events**
   - Window resize
   - System notifications
   - Download progress updates

## Error Handling

### Component-Level Errors

1. **Input Validation**
   - URL format validation
   - Required field checking
   - Format compatibility

2. **State Recovery**
   - Error state display
   - Retry mechanisms
   - Fallback UI

### Application-Level Errors

1. **Network Errors**
   - Connection issues
   - API failures
   - Timeout handling

2. **System Errors**
   - File system errors
   - Permission issues
   - Resource limitations 