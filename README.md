# YouTube Downloader GUI 🎬

A cross-platform, macOS-styled desktop application for downloading YouTube videos with a graphical interface, powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org/).

## Features ✨

- **Modern UI**: Clean, macOS-inspired design using React and Tailwind CSS
- **Video Info Preview**: Fetch and display video details before downloading
- **Format Selection**: Choose video/audio formats and subtitles
- **Subtitle Support**: Download and embed multi-language subtitles
- **Download Management**:
  - Real-time progress tracking
  - Resume interrupted downloads
  - Automatic merging of video/audio streams
- **Cookie Integration**: Use browser cookies to bypass YouTube restrictions
- **Cross-Platform**: Supports macOS, Windows, and Linux

## Architecture 🏗️

- **Electron**: Desktop application framework
- **React**: UI library for the renderer process
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool
- **yt-dlp & ffmpeg**: Core download and media processing tools

### Core Modules 🔧

- **TaskManager** (`src/main/task/TaskManager.js`):
  - Handles creation, deletion, scanning, and persistence of download tasks
  - Stores task state in `.ytd` files for resuming and management
- **TaskRunner** (`src/main/task/TaskRunner.js`):
  - Executes each download task step-by-step (info fetch, download, merge, etc.)
  - Runs yt-dlp/ffmpeg as child processes and parses their output for progress
  - Sends real-time progress updates to the renderer
- **IPCHandler** (`src/main/ipc/IPCHandler.js`):
  - Manages inter-process communication between Electron main and renderer processes

## Directory Structure 📁

```
youtube-downloader-gui/
├── src/
│   ├── main/                # Electron main process
│   │   ├── ipc/             # IPC handlers
│   │   ├── task/            # Task management and execution
│   │   └── ...
│   ├── renderer/            # React renderer process
│   │   ├── components/      # UI components
│   │   └── ...
│   └── components/          # Shared components (if any)
├── dist/                    # Production build output
├── release/                 # Release assets
├── package.json             # Project metadata and scripts
└── ...
```

## Prerequisites 📋

- **yt-dlp**: YouTube video downloader
- **ffmpeg**: Media processing and merging

### Install yt-dlp
- **macOS**: `brew install yt-dlp`
- **Windows/Linux**: `pip3 install yt-dlp`

### Install ffmpeg
- **macOS**: `brew install ffmpeg`
- **Windows**: [Download from ffmpeg.org](https://ffmpeg.org/download.html)
- **Linux**: `sudo apt install ffmpeg`

## Getting Started (Development) 🚀

1. **Clone the repository**
   ```bash
   git clone https://github.com/harveyzhang814/youtube-downloader-gui.git
   cd youtube-downloader-gui
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start development mode**
   ```bash
   npm run dev
   ```
4. **Build for production**
   ```bash
   npm run build
   npm run build:bin
   ```

## Usage 💻

After building or installing, run the application from your terminal:
```bash
youtube-downloader-gui
```

## License 📄

This project is licensed under the ISC License.

## Acknowledgements 🙏

- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [Electron](https://electronjs.org)
- [React](https://reactjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [ffmpeg](https://ffmpeg.org)