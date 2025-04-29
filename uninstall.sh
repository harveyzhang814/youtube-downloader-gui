#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Uninstalling YouTube Downloader GUI...${NC}"

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    OS="win"
fi

# Remove installation directory
INSTALL_DIR="$HOME/.youtube-downloader-gui"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing installation directory...${NC}"
    rm -rf "$INSTALL_DIR"
fi

# Remove symbolic link or command file
if [[ "$OS" == "win" ]]; then
    # Remove Windows command file
    WINDOWS_CMD="$USERPROFILE/AppData/Local/Microsoft/WindowsApps/youtube-downloader-gui.cmd"
    if [ -f "$WINDOWS_CMD" ]; then
        echo -e "${YELLOW}Removing Windows command file...${NC}"
        rm -f "$WINDOWS_CMD"
    fi
else
    # Remove Unix symbolic link
    if [[ "$OS" == "macos" ]]; then
        SYMLINK="/usr/local/bin/youtube-downloader-gui"
    else
        SYMLINK="$HOME/.local/bin/youtube-downloader-gui"
    fi
    
    if [ -L "$SYMLINK" ]; then
        echo -e "${YELLOW}Removing symbolic link...${NC}"
        rm -f "$SYMLINK"
    fi
fi

echo -e "${GREEN}YouTube Downloader GUI has been uninstalled successfully!${NC}"

# Optional: Ask if user wants to remove yt-dlp as well
read -p "Would you like to remove yt-dlp as well? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing yt-dlp...${NC}"
    pip3 uninstall -y yt-dlp
    echo -e "${GREEN}yt-dlp has been removed.${NC}"
fi

# Note: We don't remove ffmpeg as it might be used by other applications 