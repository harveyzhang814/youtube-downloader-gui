const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec, spawn } = require('child_process');
const Store = require('electron-store').default;
const fs = require('fs');

// Initialize store for settings
const store = new Store({
  schema: {
    downloadPath: {
      type: 'string',
      default: app.getPath('downloads')
    },
    browserCookie: {
      type: 'string',
      default: 'chrome'
    }
  }
});

// Keep a global reference of the window object
let mainWindow;

// Check if yt-dlp and ffmpeg are installed
const checkDependencies = () => {
  return new Promise((resolve) => {
    const dependencies = {
      ytdlp: false,
      ffmpeg: false
    };

    exec('yt-dlp --version', (error) => {
      dependencies.ytdlp = !error;
      
      exec('ffmpeg -version', (ffmpegError) => {
        dependencies.ffmpeg = !ffmpegError;
        resolve(dependencies);
      });
    });
  });
};

const createWindow = async () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: isDev ? false : true // Disable web security only in dev mode
    },
    titleBarStyle: 'hiddenInset', // macOS style window
    backgroundColor: '#f5f5f7',
  });

  // Load the index.html from vite dev server if in development
  // or from the built file if in production
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../../dist/renderer/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Check dependencies on startup
  const dependencies = await checkDependencies();
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('dependencies-check', dependencies);
  });
};

// Create the main application window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate the window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for renderer process communication
ipcMain.on('get-settings', (event) => {
  event.returnValue = {
    downloadPath: store.get('downloadPath'),
    browserCookie: store.get('browserCookie')
  };
});

ipcMain.on('update-settings', (event, settings) => {
  store.set('downloadPath', settings.downloadPath);
  store.set('browserCookie', settings.browserCookie);
  event.returnValue = true;
});

// Handle getting available formats
ipcMain.handle('get-available-formats', async (event, url) => {
  return new Promise((resolve, reject) => {
    const browserCookie = store.get('browserCookie');
    console.log('Fetching formats with browser cookie:', browserCookie);
    
    const ytdlCommand = spawn('yt-dlp', [
      '--cookies-from-browser', browserCookie,
      '-F',
      url
    ]);

    let stdout = '';
    let stderr = '';

    ytdlCommand.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    ytdlCommand.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      console.error(`yt-dlp stderr: ${chunk}`);
    });

    ytdlCommand.on('error', (error) => {
      console.error('Failed to start yt-dlp process:', error);
      reject(new Error(`Failed to start yt-dlp: ${error.message}`));
    });

    ytdlCommand.on('close', (code) => {
      console.log('yt-dlp process exited with code:', code);
      
      if (code === 0 && stdout) {
        try {
          // Parse the format output
          const formats = stdout.split('\n')
            .filter(line => {
              // Skip header lines, empty lines, and separator lines
              return line.trim() && 
                     !line.startsWith('[') && 
                     !line.includes('Available formats') &&
                     !line.includes('ID') && // Skip column headers
                     !line.includes('─');
            })
            .map(line => {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 4) {
                const id = parts[0];
                const ext = parts[1];
                const resolution = parts[2];
                
                // Extract FPS if available (it's usually after resolution)
                let fps = null;
                let filesize = null;
                let remainingParts = parts.slice(3);
                
                // Look for FPS value
                const fpsIndex = remainingParts.findIndex(part => !isNaN(part) && part.length <= 3);
                if (fpsIndex !== -1) {
                  fps = parseInt(remainingParts[fpsIndex]);
                }

                // Look for filesize (usually contains KiB, MiB, or GiB)
                const filesizeIndex = remainingParts.findIndex(part => 
                  part.includes('KiB') || part.includes('MiB') || part.includes('GiB'));
                if (filesizeIndex !== -1) {
                  filesize = remainingParts[filesizeIndex];
                }

                // Join the remaining parts as description
                const description = remainingParts.join(' ');

                return {
                  id,
                  ext,
                  resolution: resolution === 'audio' ? 'audio only' : resolution,
                  fps: fps || '',
                  filesize: filesize || 'N/A',
                  description
                };
              }
              return null;
            })
            .filter(format => format !== null)
            // Sort by resolution (audio last, then descending resolution)
            .sort((a, b) => {
              if (a.resolution === 'audio only' && b.resolution === 'audio only') return 0;
              if (a.resolution === 'audio only') return 1;
              if (b.resolution === 'audio only') return -1;
              
              // Extract numeric resolution for comparison
              const getNumericResolution = (res) => {
                const match = res.match(/(\d+)x(\d+)/);
                return match ? parseInt(match[2]) : 0;
              };
              
              return getNumericResolution(b.resolution) - getNumericResolution(a.resolution);
            });

          if (formats.length === 0) {
            console.error('No formats found in output:', stdout);
            reject(new Error('No video formats found'));
          } else {
            resolve(formats);
          }
        } catch (error) {
          console.error('Format parsing error:', error);
          console.error('Raw output:', stdout);
          reject(new Error(`Failed to parse format information: ${error.message}`));
        }
      } else {
        const errorMessage = stderr || 'Unknown error occurred';
        console.error('yt-dlp failed:', errorMessage);
        reject(new Error(`Failed to get format information: ${errorMessage}`));
      }
    });
  });
});

ipcMain.handle('select-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    store.set('downloadPath', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-video-info', async (event, url) => {
  return new Promise((resolve, reject) => {
    const browserCookie = store.get('browserCookie');
    const ytdlCommand = spawn('yt-dlp', [
      '--cookies-from-browser', browserCookie,
      '--dump-json',
      url
    ]);

    let data = '';
    ytdlCommand.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    ytdlCommand.on('close', (code) => {
      if (code === 0 && data) {
        try {
          const videoInfo = JSON.parse(data);
          resolve({
            title: videoInfo.title,
            formats: videoInfo.formats,
            thumbnails: videoInfo.thumbnails,
            duration: videoInfo.duration,
            description: videoInfo.description
          });
        } catch (error) {
          reject(new Error('Failed to parse video information'));
        }
      } else {
        reject(new Error('Failed to get video information'));
      }
    });

    ytdlCommand.stderr.on('data', (data) => {
      console.error(`yt-dlp error: ${data}`);
    });
  });
});

// Handle video download
ipcMain.handle('download-video', async (event, { url, format, subtitles }) => {
  const downloadPath = store.get('downloadPath');
  const browserCookie = store.get('browserCookie');

  // Prepare command arguments
  const args = [
    '--cookies-from-browser', browserCookie,
    '-o', `${downloadPath}/%(title)s.%(ext)s`,
    '-f', format  // Use the selected format directly
  ];

  if (subtitles) {
    args.push('--sub-langs', subtitles);
    args.push('--write-auto-sub');
  }

  // Add the URL at the end
  args.push(url);

  const downloadProcess = spawn('yt-dlp', args);
  
  let downloadId = Date.now().toString();
  let downloadInfo = {
    id: downloadId,
    url: url,
    title: 'Loading...',
    progress: 0,
    speed: '0 KiB/s',
    size: 'Unknown',
    eta: 'Unknown',
    status: 'downloading',
    path: downloadPath
  };

  // Send initial download info
  mainWindow.webContents.send('download-started', downloadInfo);

  downloadProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Try to parse the progress information from yt-dlp output
    if (output.includes('[download]')) {
      // Extract progress percentage
      const progressMatch = output.match(/(\d+\.\d+)%/);
      if (progressMatch) {
        downloadInfo.progress = parseFloat(progressMatch[1]);
      }

      // Extract download speed
      const speedMatch = output.match(/at\s+(.*?)\s+/);
      if (speedMatch) {
        downloadInfo.speed = speedMatch[1];
      }

      // Extract file size
      const sizeMatch = output.match(/of\s+~?(.*?)\s+/);
      if (sizeMatch) {
        downloadInfo.size = sizeMatch[1];
      }

      // Extract estimated time
      const etaMatch = output.match(/ETA\s+(.*?)\s*$/);
      if (etaMatch) {
        downloadInfo.eta = etaMatch[1];
      }

      // Update download info in renderer
      mainWindow.webContents.send('download-progress', downloadInfo);
    }

    // Try to extract the title if we don't have it yet
    if (downloadInfo.title === 'Loading...' && output.includes('[download]')) {
      const titleMatch = output.match(/\[download\]\s+Destination:\s+.*?[/\\](.+?)\./);
      if (titleMatch) {
        downloadInfo.title = titleMatch[1];
        mainWindow.webContents.send('download-progress', downloadInfo);
      }
    }
  });

  downloadProcess.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
  });

  downloadProcess.on('close', (code) => {
    downloadInfo.status = code === 0 ? 'completed' : 'error';
    mainWindow.webContents.send('download-finished', downloadInfo);
  });

  // Return the download ID to the renderer
  return downloadId;
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// Check for updates to yt-dlp
ipcMain.handle('update-ytdlp', async () => {
  return new Promise((resolve) => {
    const updateProcess = spawn('yt-dlp', ['-U']);
    
    updateProcess.on('close', (code) => {
      resolve(code === 0);
    });
  });
}); 