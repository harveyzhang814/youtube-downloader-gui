#!/usr/bin/env node

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
    const args = [
      '--cookies-from-browser', browserCookie,
      '-F',
      url
    ];
    // 只在日志显示时添加引号
    const logArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes('&') || arg.includes('?')) {
        return `"${arg}"`;
      }
      return arg;
    });
    console.log('\n[yt-dlp] 执行命令:', 'yt-dlp', ...logArgs);
    
    const ytdlCommand = spawn('yt-dlp', args);

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
          const allFormats = stdout.split('\n')
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

                // Determine if this is an audio-only format
                const isAudioOnly = description.toLowerCase().includes('audio only') || resolution === 'audio';

                // Extract VBR (Video Bitrate) if available
                let vbr = null;
                const vbrMatch = description.match(/(\d+)k.*?fps/i);
                if (vbrMatch && !isAudioOnly) {
                  vbr = `${vbrMatch[1]} kbps`;
                }

                // Extract ABR (Audio Bitrate) if available
                let abr = null;
                const abrMatch = description.match(/(\d+)k\s*\(audio/i) || description.match(/audio.*?(\d+)k/i);
                if (abrMatch) {
                  abr = `${abrMatch[1]} kbps`;
                }

                // Extract ASR (Audio Sample Rate) if available
                let asr = null;
                const asrMatch = description.match(/(\d+)Hz/i) || description.match(/(\d+) kHz/i);
                if (asrMatch) {
                  asr = asrMatch[0];
                }

                return {
                  id,
                  ext,
                  resolution: isAudioOnly ? 'audio only' : resolution,
                  fps: fps || '',
                  filesize: filesize || 'N/A',
                  description,
                  isAudioOnly,
                  vbr: vbr || '',
                  abr: abr || '',
                  asr: asr || ''
                };
              }
              return null;
            })
            .filter(format => format !== null);

          // Separate formats into video and audio
          const videoFormats = allFormats
            .filter(format => !format.isAudioOnly)
            .sort((a, b) => {
              // Extract numeric resolution for comparison
              const getNumericResolution = (res) => {
                const match = res.match(/(\d+)x(\d+)/);
                return match ? parseInt(match[2]) : 0;
              };
              return getNumericResolution(b.resolution) - getNumericResolution(a.resolution);
            });

          const audioFormats = allFormats
            .filter(format => format.isAudioOnly)
            .sort((a, b) => {
              // Sort by bitrate if available in description
              const getBitrate = (desc) => {
                const match = desc.match(/(\d+)k/);
                return match ? parseInt(match[1]) : 0;
              };
              return getBitrate(b.description) - getBitrate(a.description);
            });

          if (videoFormats.length === 0 && audioFormats.length === 0) {
            console.error('No formats found in output:', stdout);
            reject(new Error('No video or audio formats found'));
          } else {
            resolve({ videoFormats, audioFormats });
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
    const args = [
      '--cookies-from-browser', browserCookie,
      '--dump-json',
      url
    ];
    // 只在日志显示时添加引号
    const logArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes('&') || arg.includes('?')) {
        return `"${arg}"`;
      }
      return arg;
    });
    console.log('\n[yt-dlp] 执行命令:', 'yt-dlp', ...logArgs);
    
    const ytdlCommand = spawn('yt-dlp', args);

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
ipcMain.handle('download-video', async (event, { url, videoFormat, audioFormat, subtitles, saveSubsAsFile }) => {
  const downloadPath = store.get('downloadPath');
  const browserCookie = store.get('browserCookie');

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

  try {
    // 并行下载视频和音频
    const downloadPromises = [];

    // 视频下载
    if (videoFormat) {
      const videoArgs = [
        '--cookies-from-browser', browserCookie,
        '-f', videoFormat,
        '-o', `%(title)s_video.%(ext)s`,
        url
      ];

      const logVideoArgs = videoArgs.map(arg => {
        if (arg.includes(' ') || arg.includes('&') || arg.includes('?')) {
          return `"${arg}"`;
        }
        return arg;
      });
      console.log('\n[yt-dlp] 执行视频下载命令:', 'yt-dlp', ...logVideoArgs);

      const videoProcess = spawn('yt-dlp', videoArgs, { cwd: downloadPath });
      let videoTitle = '';

      console.log('\n[yt-dlp] 视频下载进程已启动，PID:', videoProcess.pid);

      videoProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[yt-dlp] 视频下载输出:', output);
        if (output.includes('[download]')) {
          // 提取标题 - 完全排除 Destination: 和路径信息
          const titleMatch = output.match(/\[download\](?:\s+Destination:\s+.*?[/\\])?(?:.*?[/\\])?([^/\\]+?)(?:_video\.| has already been downloaded)/);
          if (titleMatch && !videoTitle) {
            videoTitle = titleMatch[1].trim();
            console.log('[yt-dlp] 提取的视频标题:', videoTitle);
            downloadInfo.title = videoTitle;
            mainWindow.webContents.send('download-progress', downloadInfo);
          }
        }
      });

      videoProcess.stderr.on('data', (data) => {
        console.error(`[yt-dlp] 视频下载错误: ${data}`);
      });

      downloadPromises.push(new Promise((resolve, reject) => {
        videoProcess.on('close', (code) => {
          console.log(`\n[yt-dlp] 视频下载进程已结束，PID: ${videoProcess.pid}, 退出码: ${code}`);
          if (code === 0) {
            resolve({ type: 'video', title: videoTitle });
          } else {
            reject(new Error('Video download failed'));
          }
        });
      }));
    }

    // 音频下载
    if (audioFormat) {
      const audioArgs = [
        '--cookies-from-browser', browserCookie,
        '-f', audioFormat,
        '-o', `%(title)s_audio.%(ext)s`,
        url
      ];

      const logAudioArgs = audioArgs.map(arg => {
        if (arg.includes(' ') || arg.includes('&') || arg.includes('?')) {
          return `"${arg}"`;
        }
        return arg;
      });
      console.log('\n[yt-dlp] 执行音频下载命令:', 'yt-dlp', ...logAudioArgs);

      const audioProcess = spawn('yt-dlp', audioArgs, { cwd: downloadPath });
      let audioTitle = '';

      console.log('\n[yt-dlp] 音频下载进程已启动，PID:', audioProcess.pid);

      audioProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[yt-dlp] 音频下载输出:', output);
        if (output.includes('[download]')) {
          // 提取标题 - 完全排除 Destination: 和路径信息
          const titleMatch = output.match(/\[download\](?:\s+Destination:\s+.*?[/\\])?(?:.*?[/\\])?([^/\\]+?)(?:_audio\.| has already been downloaded)/);
          if (titleMatch && !audioTitle) {
            audioTitle = titleMatch[1].trim();
            console.log('[yt-dlp] 提取的音频标题:', audioTitle);
            if (!downloadInfo.title || downloadInfo.title === 'Loading...') {
              downloadInfo.title = audioTitle;
              mainWindow.webContents.send('download-progress', downloadInfo);
            }
          }
        }
      });

      audioProcess.stderr.on('data', (data) => {
        console.error(`[yt-dlp] 音频下载错误: ${data}`);
      });

      downloadPromises.push(new Promise((resolve, reject) => {
        audioProcess.on('close', (code) => {
          console.log(`\n[yt-dlp] 音频下载进程已结束，PID: ${audioProcess.pid}, 退出码: ${code}`);
          if (code === 0) {
            resolve({ type: 'audio', title: audioTitle });
          } else {
            reject(new Error('Audio download failed'));
          }
        });
      }));
    }

    // 等待所有下载完成
    const results = await Promise.all(downloadPromises);
    const titles = results.map(r => r.title).filter(Boolean);
    // 清理标题中的 Destination: 前缀
    const cleanTitles = titles.map(title => title.replace(/^Destination:\s+/i, '').trim());
    const finalTitle = cleanTitles[0] || 'Unknown';

    console.log('[yt-dlp] 下载完成，最终标题:', finalTitle);
    console.log('[yt-dlp] 所有标题:', cleanTitles);

    // 如果同时下载了视频和音频，需要合并
    if (videoFormat && audioFormat) {
      // 确保 downloadPath 是绝对路径
      const absDownloadPath = path.isAbsolute(downloadPath) ? downloadPath : path.resolve(downloadPath);
      
      // 查找下载的文件
      const files = fs.readdirSync(absDownloadPath);
      console.log('[yt-dlp] 目录中的文件:', files);
      
      // 使用更宽松的匹配条件
      const videoFile = files.find(f => f.includes('_video.'));
      const audioFile = files.find(f => f.includes('_audio.'));
      
      if (!videoFile || !audioFile) {
        console.error('[ffmpeg] 找不到下载的文件:', { videoFile, audioFile });
        throw new Error('找不到下载的视频或音频文件');
      }

      console.log('[ffmpeg] 找到的文件:', {
        video: videoFile,
        audio: audioFile
      });

      const videoFilePath = path.join(absDownloadPath, videoFile);
      const audioFilePath = path.join(absDownloadPath, audioFile);
      const outputFile = path.join(absDownloadPath, `${finalTitle}.mp4`);

      // 检查文件是否存在
      if (!fs.existsSync(videoFilePath)) {
        console.error('[ffmpeg] 视频文件不存在:', videoFilePath);
        throw new Error(`视频文件不存在: ${videoFilePath}`);
      }
      if (!fs.existsSync(audioFilePath)) {
        console.error('[ffmpeg] 音频文件不存在:', audioFilePath);
        throw new Error(`音频文件不存在: ${audioFilePath}`);
      }

      console.log('[ffmpeg] 找到的文件:', {
        video: videoFile,
        audio: audioFile
      });

      const ffmpegArgs = [
        '-i', videoFilePath,
        '-i', audioFilePath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        outputFile
      ];

      // 使用 spawn 时也设置工作目录
      const mergeProcess = spawn('ffmpeg', ffmpegArgs, { cwd: absDownloadPath });
      let errorOutput = '';

      console.log('\n[ffmpeg] 合并进程已启动，PID:', mergeProcess.pid);
      console.log('[ffmpeg] 下载路径:', absDownloadPath);
      console.log('[ffmpeg] 输入文件:', {
        video: videoFile,
        audio: audioFile
      });
      console.log('[ffmpeg] 输出文件:', outputFile);
      console.log('[ffmpeg] 完整命令:', 'ffmpeg', ffmpegArgs.join(' '));

      mergeProcess.stderr.on('data', (data) => {
        const output = data.toString();
        // 检查是否是进度信息
        if (output.includes('frame=') || output.includes('fps=') || output.includes('time=') || output.includes('bitrate=')) {
          console.log(`[ffmpeg] 进度: ${output.trim()}`);
        } else if (output.includes('Error') || output.includes('error') || output.includes('Invalid')) {
          // 只记录真正的错误信息
          errorOutput += output;
          console.error(`[ffmpeg] 错误: ${output}`);
        } else {
          // 其他信息作为普通日志输出
          console.log(`[ffmpeg] 信息: ${output.trim()}`);
        }
      });

      await new Promise((resolve, reject) => {
        mergeProcess.on('close', (code) => {
          console.log(`\n[ffmpeg] 合并进程已结束，PID: ${mergeProcess.pid}, 退出码: ${code}`);
          
          if (code === 0) {
            // 检查输出文件是否存在且大小正常
            if (fs.existsSync(outputFile)) {
              const stats = fs.statSync(outputFile);
              if (stats.size > 0) {
                console.log('[ffmpeg] 合并成功，输出文件大小:', stats.size, 'bytes');
                // 删除临时文件
                try {
                  fs.unlinkSync(videoFilePath);
                  fs.unlinkSync(audioFilePath);
                  console.log('[ffmpeg] 临时文件已删除');
                  resolve();
                } catch (error) {
                  console.error('[ffmpeg] 删除临时文件失败:', error);
                  // 继续执行，因为合并已经成功
                  resolve();
                }
              } else {
                reject(new Error('合并后的文件大小为0'));
              }
            } else {
              reject(new Error('合并后的文件不存在'));
            }
          } else {
            reject(new Error(`合并失败 (退出码: ${code}): ${errorOutput}`));
          }
        });
      });
    }

    // 如果需要下载字幕
    if (subtitles) {
      const subtitleArgs = [
        '--skip-download',
        '--sub-langs', subtitles,
        '--write-auto-sub',
        '-o', `${downloadPath}/%(title)s.%(ext)s`,
        url
      ];

      const logSubtitleArgs = subtitleArgs.map(arg => {
        if (arg.includes(' ') || arg.includes('&') || arg.includes('?')) {
          return `"${arg}"`;
        }
        return arg;
      });
      console.log('\n[yt-dlp] 执行字幕下载命令:', 'yt-dlp', ...logSubtitleArgs);

      const subtitleProcess = spawn('yt-dlp', subtitleArgs);

      console.log('\n[yt-dlp] 字幕下载进程已启动，PID:', subtitleProcess.pid);

      subtitleProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        console.error(`[yt-dlp] 字幕下载错误: ${errorMsg}`);
        if (!errorMsg.includes('Did not get any data blocks')) {
          downloadInfo.warning = '字幕下载可能失败';
          mainWindow.webContents.send('download-progress', downloadInfo);
        }
      });

      await new Promise((resolve) => {
        subtitleProcess.on('close', (code) => {
          console.log(`\n[yt-dlp] 字幕下载进程已结束，PID: ${subtitleProcess.pid}, 退出码: ${code}`);
          resolve();
        });
      });

      // 如果需要嵌入字幕
      console.log('[yt-dlp] 字幕嵌入条件检查:', {
        saveSubsAsFile,
        type: typeof saveSubsAsFile,
        subtitles,
        finalTitle
      });

      if (saveSubsAsFile === false) {  // 明确检查是否为 false
        try {
          // 获取视频文件的实际扩展名
          const videoFile = path.join(downloadPath, `${finalTitle}.mp4`);
          const videoExt = path.extname(videoFile).toLowerCase();
          
          // 根据容器格式选择字幕编码器
          let subtitleCodec;
          switch (videoExt) {
            case '.mp4':
              subtitleCodec = 'mov_text';  // MP4 容器使用 mov_text
              break;
            case '.webm':
              subtitleCodec = 'webvtt';    // WebM 容器使用 webvtt
              break;
            case '.mkv':
              subtitleCodec = 'srt';       // MKV 容器可以使用多种格式，这里使用 srt
              break;
            default:
              subtitleCodec = 'mov_text';  // 默认使用 mov_text
              console.warn(`[ffmpeg] 未知的视频容器格式 ${videoExt}，使用默认字幕编码器 mov_text`);
          }

          console.log('[ffmpeg] 视频容器格式:', videoExt);
          console.log('[ffmpeg] 选择的字幕编码器:', subtitleCodec);

          // 处理多个字幕文件
          const subtitleLangs = subtitles.split(',');
          const subtitleFiles = subtitleLangs.map(lang => 
            path.join(downloadPath, `${finalTitle}.${lang}.vtt`)
          ).filter(file => fs.existsSync(file));

          console.log('[yt-dlp] 找到的字幕文件:', subtitleFiles);

          if (subtitleFiles.length > 0) {
            // 使用新的文件名格式：原文件名_subtitled.mp4
            const outputFile = path.join(downloadPath, `${finalTitle}_subtitled${videoExt}`);

            // 构建 ffmpeg 命令参数
            const ffmpegArgs = ['-i', videoFile];
            
            // 添加所有字幕文件作为输入
            subtitleFiles.forEach(file => {
              ffmpegArgs.push('-i', file);
            });

            // 添加编码器参数
            ffmpegArgs.push(
              '-c:v', 'copy',
              '-c:a', 'copy'
            );

            // 映射原始视频的所有流（视频和音频）
            ffmpegArgs.push(
              '-map', '0'  // 映射输入文件的所有流
            );

            // 为每个字幕流设置编码器和语言
            subtitleFiles.forEach((_, index) => {
              const langCode = subtitleLangs[index];
              const langName = getLanguageName(langCode);
              ffmpegArgs.push(
                `-c:s:${index}`, subtitleCodec,
                `-metadata:s:s:${index}`, `language=${langCode}`,
                `-metadata:s:s:${index}`, `title=${langName}`,  // 使用语言名称作为标题
                `-map`, `${index + 1}:0`  // 映射字幕流
              );
            });

            // 添加全局元数据
            ffmpegArgs.push(
              '-metadata', 'title=' + finalTitle,
              '-metadata', 'artist=YouTube',
              '-metadata', 'comment=Downloaded with YouTube Downloader'
            );

            ffmpegArgs.push(outputFile);

            console.log('\n[ffmpeg] 字幕嵌入进程准备启动');
            console.log('[ffmpeg] 使用字幕编码器:', subtitleCodec);
            console.log('[ffmpeg] 嵌入字幕数量:', subtitleFiles.length);
            console.log('[ffmpeg] 字幕语言:', subtitleLangs.map(lang => `${lang} (${getLanguageName(lang)})`).join(', '));
            console.log('[ffmpeg] 完整命令:', 'ffmpeg', ffmpegArgs.join(' '));

            // 先创建进程
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            console.log('[ffmpeg] 字幕嵌入进程已启动，PID:', ffmpegProcess.pid);

            ffmpegProcess.stderr.on('data', (data) => {
              const output = data.toString();
              // 检查是否是进度信息
              if (output.includes('frame=') || output.includes('fps=') || output.includes('time=') || output.includes('bitrate=')) {
                console.log(`[ffmpeg] 进度: ${output.trim()}`);
              } else if (output.includes('Error') || output.includes('error') || output.includes('Invalid')) {
                console.error(`[ffmpeg] 错误: ${output}`);
              } else {
                console.log(`[ffmpeg] 信息: ${output.trim()}`);
              }
            });

            await new Promise((resolve, reject) => {
              ffmpegProcess.on('close', (code) => {
                console.log(`\n[ffmpeg] 字幕嵌入进程已结束，PID: ${ffmpegProcess.pid}, 退出码: ${code}`);
                if (code === 0) {
                  // 验证字幕是否成功嵌入
                  const verifyProcess = spawn('ffmpeg', ['-i', outputFile]);
                  let ffmpegOutput = '';

                  verifyProcess.stderr.on('data', (data) => {
                    ffmpegOutput += data.toString();
                  });

                  verifyProcess.on('close', (verifyCode) => {
                    if (verifyCode === 0 || verifyCode === 1) { // ffmpeg 在显示信息时可能返回 1
                      console.log('[ffmpeg] 视频文件信息:');
                      console.log(ffmpegOutput);

                      // 检查输出中是否包含字幕流信息
                      const hasSubtitles = ffmpegOutput.includes('Stream #0:') && 
                                        ffmpegOutput.includes('Subtitle:');
                      
                      if (hasSubtitles) {
                        console.log('[ffmpeg] 字幕验证成功:');
                        // 提取并显示字幕流信息
                        const subtitleInfo = ffmpegOutput.match(/Stream #0:\d+.*?Subtitle:.*?(?=Stream|$)/gs);
                        if (subtitleInfo) {
                          subtitleInfo.forEach(info => {
                            console.log('[ffmpeg] 字幕流:', info.trim());
                            // 检查语言标签
                            const langMatch = info.match(/language: (\w+)/);
                            if (langMatch) {
                              console.log('[ffmpeg] 字幕语言:', langMatch[1]);
                            }
                          });
                        }
                        console.log('[ffmpeg] 字幕嵌入成功，新文件已保存:', outputFile);
                      } else {
                        console.warn('[ffmpeg] 警告: 未检测到字幕流');
                        // 显示所有可用的流信息
                        const streamInfo = ffmpegOutput.match(/Stream #0:\d+.*?(?=Stream|$)/gs);
                        if (streamInfo) {
                          console.log('[ffmpeg] 当前视频包含的流:');
                          streamInfo.forEach(info => {
                            console.log('[ffmpeg] 流:', info.trim());
                          });
                        }
                      }
                    }
                    resolve();
                  });
                } else {
                  reject(new Error('字幕嵌入失败'));
                }
              });
            });
          } else {
            console.log('[yt-dlp] 未找到可用的字幕文件');
          }
        } catch (error) {
          console.error('Error embedding subtitles:', error);
          downloadInfo.warning = '字幕嵌入失败';
          mainWindow.webContents.send('download-progress', downloadInfo);
        }
      } else {
        console.log('[yt-dlp] 字幕将保存为单独文件');
      }
    }

    downloadInfo.status = 'completed';
    if (downloadInfo.warning) {
      downloadInfo.status = 'completed_with_warning';
    }
    mainWindow.webContents.send('download-finished', downloadInfo);

    return downloadId;
  } catch (error) {
    console.error('Download failed:', error);
    downloadInfo.status = 'error';
    downloadInfo.error = error.message;
    mainWindow.webContents.send('download-finished', downloadInfo);
    throw error;
  }
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// Check for updates to yt-dlp
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