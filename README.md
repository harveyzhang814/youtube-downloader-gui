# YouTube Downloader GUI

A macOS-styled desktop application that provides a user-friendly graphical interface for downloading YouTube videos using the yt-dlp command-line tool.

![YouTube Downloader GUI](https://via.placeholder.com/800x500.png?text=YouTube+Downloader+GUI)

## Quick Installation

You can install the application directly from GitHub using the following command:

```bash
curl -o- https://raw.githubusercontent.com/harveyzhang814/youtube-downloader-gui/main/install.sh | bash
```

After installation, you can run the application from any terminal:

```bash
youtube-downloader-gui
```

## Features

- **User-friendly Interface**: Clean, macOS-styled design across all platforms
- **Video Preview**: Fetch video information before downloading
- **Download Management**: Track download progress, speed, and file size
- **Advanced Options**: Format selection and subtitle download options
- **Cookie Integration**: Use browser cookies to bypass YouTube restrictions
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Prerequisites

This application requires the following dependencies to be installed on your system:

- **Python 3.x**: Required for yt-dlp
- **yt-dlp**: The command-line YouTube downloader
- **ffmpeg**: Required for media processing

### Installing Dependencies

#### Python 3.x

- **macOS**: `brew install python3`
- **Windows**: Download from [python.org](https://www.python.org/downloads/)
- **Linux**: Usually pre-installed, or `sudo apt install python3`

#### yt-dlp

- **macOS (Homebrew)**: `brew install yt-dlp`
- **Windows**: `pip3 install yt-dlp`
- **Linux**: `pip3 install yt-dlp`

#### ffmpeg

- **macOS (Homebrew)**: `brew install ffmpeg`
- **Windows**: [Download from ffmpeg.org](https://ffmpeg.org/download.html)
- **Linux**: `sudo apt install ffmpeg`

## Development

If you want to contribute to the development, you'll need:

- Node.js 18.x or later
- npm 8.x or later

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/harveyzhang814/youtube-downloader-gui.git
   cd youtube-downloader-gui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build standalone executables:
   ```bash
   npm run build
   npm run build:bin
   ```

## License

This project is licensed under the ISC License.

## Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The command-line downloader that powers this application
- [Electron](https://electronjs.org) - Cross-platform desktop application framework
- [React](https://reactjs.org) - UI library
- [Tailwind CSS](https://tailwindcss.com) - CSS framework