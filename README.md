# YouTube Downloader GUI

A macOS-styled desktop application that provides a user-friendly graphical interface for downloading YouTube videos using the yt-dlp command-line tool.

![YouTube Downloader GUI](https://via.placeholder.com/800x500.png?text=YouTube+Downloader+GUI)

## Features

- **User-friendly Interface**: Clean, macOS-styled design across all platforms
- **Video Preview**: Fetch video information before downloading
- **Download Management**: Track download progress, speed, and file size
- **Advanced Options**: Format selection and subtitle download options
- **Cookie Integration**: Use browser cookies to bypass YouTube restrictions
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Prerequisites

This application requires the following dependencies to be installed on your system:

- **yt-dlp**: The command-line YouTube downloader
- **ffmpeg**: Required for media processing

### Installation Instructions

#### yt-dlp

- **macOS (Homebrew)**: `brew install yt-dlp`
- **Windows**: [Download from GitHub](https://github.com/yt-dlp/yt-dlp#installation)
- **Linux**: `sudo apt install yt-dlp` or `sudo pip install yt-dlp`

#### ffmpeg

- **macOS (Homebrew)**: `brew install ffmpeg`
- **Windows**: [Download from ffmpeg.org](https://ffmpeg.org/download.html)
- **Linux**: `sudo apt install ffmpeg`

## Installation

1. Download the latest release for your platform from the [Releases](https://github.com/harveyzhang814/youtube-downloader-gui/releases) page.
2. Install the application using the installer for your platform.
3. Launch the application.

## Development

### Prerequisites

- Node.js (v14+)
- npm or yarn

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

### Building

To build the application for your platform:

```bash
npm run package
```

The packaged application will be available in the `release` directory.

## License

This project is licensed under the ISC License.

## Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The command-line downloader that powers this application
- [Electron](https://electronjs.org) - Cross-platform desktop application framework
- [React](https://reactjs.org) - UI library
- [Tailwind CSS](https://tailwindcss.com) - CSS framework