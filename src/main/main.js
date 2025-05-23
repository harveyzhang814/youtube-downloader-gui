#!/usr/bin/env node

/**
 * Electron 主进程入口文件。
 * 负责应用生命周期、窗口管理、与渲染进程通信、下载/合并/字幕处理等核心逻辑。
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec, spawn } = require('child_process');
const Store = require('electron-store').default;
const fs = require('fs');
const { getLanguageName } = require('./languageMap');
const IPCHandler = require('./ipc/IPCHandler');

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

/**
 * 检查 yt-dlp 和 ffmpeg 是否已安装。
 * @returns {Promise<{ytdlp: boolean, ffmpeg: boolean}>} 依赖检测结果
 */
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

/**
 * 检查下载文件夹是否存在，不存在则重置为默认路径。
 */
const checkDownloadFolder = () => {
  const downloadPath = store.get('downloadPath');
  if (!fs.existsSync(downloadPath)) {
    // 新目标路径：用户Download目录/Youtube Downloader
    const userDownload = app.getPath('downloads');
    const newDownloadPath = path.join(userDownload, 'Youtube Downloader');
    if (!fs.existsSync(newDownloadPath)) {
      fs.mkdirSync(newDownloadPath, { recursive: true });
    }
    console.log(`Download folder ${downloadPath} does not exist, resetting to ${newDownloadPath}...`);
    store.set('downloadPath', newDownloadPath);
  }
};

/**
 * 创建主窗口并加载前端页面。
 * 注册所有 IPC 处理器，检查依赖。
 */
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

  // 注册所有 IPC handler
  IPCHandler.register(mainWindow);

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
app.whenReady().then(() => {
  try {
    console.log('Application starting...');
    checkDownloadFolder();
    createWindow().catch(error => {
      console.error('Failed to create window:', error);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
  }
}).catch(error => {
  console.error('Failed to initialize application:', error);
});

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

// 监听渲染进程请求获取设置
ipcMain.on('get-settings', (event) => {
  event.returnValue = {
    downloadPath: store.get('downloadPath'),
    browserCookie: store.get('browserCookie')
  };
});

// 监听渲染进程请求更新设置
ipcMain.on('update-settings', (event, settings) => {
  store.set('downloadPath', settings.downloadPath);
  store.set('browserCookie', settings.browserCookie);
  event.returnValue = true;
});

/**
 * 处理打开文件所在文件夹的请求。
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>}
 */
ipcMain.handle('open-file-location', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

/**
 * 处理 yt-dlp 更新请求。
 * @returns {Promise<boolean>} 是否更新成功
 */
ipcMain.handle('update-ytdlp', async () => {
  return new Promise((resolve) => {
    const args = ['-U'];
    console.log('\n[yt-dlp] 执行命令:', 'yt-dlp', args.join(' '));
    const updateProcess = spawn('yt-dlp', args);
    
    updateProcess.on('close', (code) => {
      resolve(code === 0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 