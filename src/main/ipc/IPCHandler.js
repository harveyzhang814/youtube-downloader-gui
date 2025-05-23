/**
 * IPCHandler 模块
 * 负责主进程与前端的 IPC 通信，暴露任务和设置相关的接口。
 * 依赖 Electron 的 ipcMain，调用 TaskManager、SettingsManager 等模块。
 *
 * 提供接口：
 *   - task:create        创建新任务
 *   - task:get           获取任务详情
 *   - task:update        更新任务
 *   - task:delete        删除任务
 *   - task:scan          扫描所有任务
 *   - task:resume        断点续传
 *   - settings:get       获取设置
 *   - settings:set       修改设置
 *   - settings:getDownloadLocation 获取下载目录
 *   - settings:setDownloadLocation 设置下载目录
 *   - settings:getCookieSource 获取 Cookie Source
 *   - settings:setCookieSource 设置 Cookie Source
 *   - task:getAvailableFormats 获取可用格式
 */

const { ipcMain, shell, dialog } = require('electron');
const TaskManager = require('../task/TaskManager');
const SettingsManager = require('../task/SettingsManager');
const Store = require('electron-store').default;
const { spawn } = require('child_process');
const store = new Store();

class IPCHandler {
  /**
   * 注册所有 IPC 事件
   * @param {BrowserWindow} win - 主窗口实例
   */
  static register(win) {
    // 创建新任务
    ipcMain.handle('task:create', async (event, settings) => {
      return TaskManager.createTask(settings);
    });

    // 获取任务详情
    ipcMain.handle('task:get', async (event, taskId) => {
      const task = TaskManager.getTask(taskId);
      try {
        const data = await task.read();
        return TaskManager.createSuccessResponse(data, taskId);
      } catch (error) {
        return TaskManager.createErrorResponse(error, taskId);
      }
    });

    // 更新任务
    ipcMain.handle('task:update', async (event, taskId, update) => {
      return TaskManager.updateTask(taskId, update);
    });

    // 删除任务
    ipcMain.handle('task:delete', async (event, taskId) => {
      return TaskManager.deleteTask(taskId);
    });

    // 扫描所有任务
    ipcMain.handle('task:scan', async () => {
      return TaskManager.scanTasks();
    });

    // 启动任务调度
    ipcMain.handle('task:start', async (event, taskId) => {
      return TaskManager.startTask(taskId, event.sender.getOwnerBrowserWindow());
    });

    // 断点续传任务
    ipcMain.handle('task:resume', async (event, taskId) => {
      return TaskManager.resumeTask(taskId, event.sender.getOwnerBrowserWindow());
    });

    // 获取全部设置
    ipcMain.handle('settings:get', async () => {
      try {
        const settings = SettingsManager.getSettings();
        return { success: true, data: settings };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 修改全部设置
    ipcMain.handle('settings:set', async (event, newSettings) => {
      try {
        SettingsManager.setSettings(newSettings);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 获取下载目录
    ipcMain.handle('settings:getDownloadLocation', async () => {
      try {
        const location = SettingsManager.getDownloadLocation();
        return { success: true, data: location };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 设置下载目录
    ipcMain.handle('settings:setDownloadLocation', async (event, newPath) => {
      try {
        SettingsManager.setDownloadLocation(newPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 获取 Cookie Source
    ipcMain.handle('settings:getCookieSource', async () => {
      try {
        const source = SettingsManager.getCookieSource();
        return { success: true, data: source };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 设置 Cookie Source
    ipcMain.handle('settings:setCookieSource', async (event, newSource) => {
      try {
        SettingsManager.setCookieSource(newSource);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 选择目录弹窗
    ipcMain.handle('dialog:chooseDirectory', async () => {
      try {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return { 
          success: true, 
          data: result.canceled ? null : result.filePaths[0] 
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 打开指定相对路径的文件夹
    ipcMain.handle('open-location', async (event, relativePath) => {
      try {
        const path = require('path');
        const rootDir = SettingsManager.getDownloadLocation();
        const absPath = path.join(rootDir, relativePath);
        await shell.openPath(absPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 获取可用格式
    ipcMain.handle('task:getAvailableFormats', async (event, url) => {
      return await IPCHandler.getAvailableFormats(url);
    });
  }

  /**
   * 获取可用格式的核心逻辑
   * @param {string} url
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  static async getAvailableFormats(url) {
    return new Promise((resolve) => {
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
        resolve({ success: false, error: `Failed to start yt-dlp: ${error.message}` });
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

                  // Extract audio language if present (only for audio)
                  let audioLang = '';
                  if (isAudioOnly) {
                    // 匹配 [en-US] English (United States) original (default), ...
                    // 提取第一个方括号后紧跟的第一个带括号的语言描述
                    const langMatch = description.match(/\[[^\]]*\]\s*([^\(\[,]+(?:\([^\)]*\))?)/);
                    if (langMatch) {
                      audioLang = langMatch[1].trim();
                    }
                  }

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
                    asr: asr || '',
                    audioLang: audioLang || ''
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
              resolve({ success: false, error: 'No video or audio formats found' });
            } else {
              resolve({ success: true, data: { videoFormats, audioFormats } });
            }
          } catch (error) {
            console.error('Format parsing error:', error);
            console.error('Raw output:', stdout);
            resolve({ success: false, error: `Failed to parse format information: ${error.message}` });
          }
        } else {
          const errorMessage = stderr || 'Unknown error occurred';
          console.error('yt-dlp failed:', errorMessage);
          resolve({ success: false, error: `Failed to get format information: ${errorMessage}` });
        }
      });
    });
  }
}

module.exports = IPCHandler; 