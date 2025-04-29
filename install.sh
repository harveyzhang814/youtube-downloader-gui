#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing YouTube Downloader GUI...${NC}"

# Detect OS and architecture
OS="unknown"
ARCH="unknown"

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    if [[ $(uname -m) == "arm64" ]]; then
        ARCH="arm64"
    else
        ARCH="x64"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    ARCH="x64"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    OS="win"
    ARCH="x64"
fi

if [[ "$OS" == "unknown" ]]; then
    echo -e "${RED}Error: Unsupported operating system${NC}"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo -e "Please install Python 3"
    exit 1
fi

# Create installation directory
INSTALL_DIR="$HOME/.youtube-downloader-gui"
mkdir -p "$INSTALL_DIR"

# Download the latest release
echo -e "${YELLOW}Downloading latest release...${NC}"
DOWNLOAD_URL="https://github.com/harveyzhang814/youtube-downloader-gui/releases/latest/download/youtube-downloader-gui-${OS}-${ARCH}"
if [[ "$OS" == "win" ]]; then
    DOWNLOAD_URL="${DOWNLOAD_URL}.exe"
fi

if command -v curl >/dev/null 2>&1; then
    curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/youtube-downloader-gui"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$INSTALL_DIR/youtube-downloader-gui" "$DOWNLOAD_URL"
else
    echo -e "${RED}Error: Neither curl nor wget is installed${NC}"
    exit 1
fi

# Make the binary executable (not needed for Windows)
if [[ "$OS" != "win" ]]; then
    chmod +x "$INSTALL_DIR/youtube-downloader-gui"
fi

# Create symbolic link to make it available in PATH
if [[ "$OS" == "win" ]]; then
    # For Windows, create a .cmd file in a directory that's typically in PATH
    WINDOWS_BIN_DIR="$USERPROFILE/AppData/Local/Microsoft/WindowsApps"
    echo "@echo off" > "$WINDOWS_BIN_DIR/youtube-downloader-gui.cmd"
    echo "\"$INSTALL_DIR/youtube-downloader-gui.exe\" %*" >> "$WINDOWS_BIN_DIR/youtube-downloader-gui.cmd"
else
    # For Unix-like systems, create symlink in /usr/local/bin
    if [[ "$OS" == "macos" ]]; then
        SYMLINK_DIR="/usr/local/bin"
    else
        SYMLINK_DIR="$HOME/.local/bin"
        mkdir -p "$SYMLINK_DIR"
    fi
    ln -sf "$INSTALL_DIR/youtube-downloader-gui" "$SYMLINK_DIR/youtube-downloader-gui"
fi

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${YELLOW}You can now run the application by typing:${NC}"
echo -e "${GREEN}youtube-downloader-gui${NC}"

# Check if yt-dlp is installed, if not provide instructions
if ! command -v yt-dlp >/dev/null 2>&1; then
    echo -e "\n${YELLOW}Note: yt-dlp is not installed. To install it:${NC}"
    echo -e "pip3 install yt-dlp"
fi

# Check if ffmpeg is installed, if not provide instructions
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "\n${YELLOW}Note: ffmpeg is not installed. To install it:${NC}"
    if [[ "$OS" == "macos" ]]; then
        echo -e "brew install ffmpeg"
    elif [[ "$OS" == "linux" ]]; then
        echo -e "sudo apt-get install ffmpeg  # For Ubuntu/Debian"
        echo -e "sudo dnf install ffmpeg      # For Fedora"
    elif [[ "$OS" == "win" ]]; then
        echo -e "Download from https://ffmpeg.org/download.html"
    fi
fi

# Add note about PATH if using Linux
if [[ "$OS" == "linux" ]]; then
    echo -e "\n${YELLOW}Note: Make sure $HOME/.local/bin is in your PATH${NC}"
    echo -e "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo -e "export PATH=\"\$HOME/.local/bin:\$PATH\""
fi 