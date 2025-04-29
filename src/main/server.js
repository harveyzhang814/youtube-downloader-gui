import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import open from 'open';
import { spawn, exec } from 'child_process';
import { homedir } from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 支持 JSON 请求体
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../dist')));

// 存储下载任务
const downloads = new Map();
let nextDownloadId = 1;

// 初始化设置
const initializeSettings = () => {
  const settingsDir = path.join(homedir(), '.youtube-downloader-gui');
  const settingsPath = path.join(settingsDir, 'settings.json');
  
  try {
    // 确保设置目录存在
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    // 如果设置文件不存在，创建默认设置
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        downloadPath: path.join(homedir(), 'Downloads'),
        browserCookie: 'chrome'
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }
    
    // 验证设置文件是否可读
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!settings.downloadPath) {
      settings.downloadPath = path.join(homedir(), 'Downloads');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
    console.log('Settings initialized:', settings);
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
};

// 检查依赖
app.get('/api/check-dependencies', async (req, res) => {
  const checkCommand = async (command) => {
    try {
      console.log(`Checking ${command}...`);
      const result = await new Promise((resolve, reject) => {
        const proc = spawn(command, ['--version']);
        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => {
          output += data;
        });

        proc.stderr.on('data', (data) => {
          error += data;
        });

        proc.on('error', (err) => {
          console.error(`Error executing ${command}:`, err);
          reject(err);
        });

        proc.on('close', (code) => {
          console.log(`${command} check completed with code ${code}`);
          console.log('Output:', output);
          console.log('Error:', error);
          
          // For ffmpeg, it outputs version info to stderr and returns non-zero
          if (command === 'ffmpeg' && error.includes('ffmpeg version')) {
            resolve(true);
          } else if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`${command} check failed with code ${code}`));
          }
        });
      });
      return result;
    } catch (error) {
      console.error(`Failed to check ${command}:`, error);
      return false;
    }
  };

  try {
    const dependencies = {
      ytdlp: await checkCommand('yt-dlp'),
      ffmpeg: await checkCommand('ffmpeg')
    };

    console.log('Dependencies check result:', dependencies);
    res.json(dependencies);
  } catch (error) {
    console.error('Dependencies check failed:', error);
    res.status(500).json({
      error: 'Failed to check dependencies',
      details: error.message
    });
  }
});

// 获取设置
app.get('/api/settings', (req, res) => {
  const settingsPath = path.join(homedir(), '.youtube-downloader-gui', 'settings.json');
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    res.json(settings);
  } catch (error) {
    res.json({
      downloadPath: path.join(homedir(), 'Downloads'),
      browserCookie: 'chrome'
    });
  }
});

// 更新设置
app.post('/api/settings', (req, res) => {
  const settingsDir = path.join(homedir(), '.youtube-downloader-gui');
  const settingsPath = path.join(settingsDir, 'settings.json');
  
  try {
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取可用格式
app.get('/api/formats', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // 读取设置以获取浏览器选择
    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(
        path.join(homedir(), '.youtube-downloader-gui', 'settings.json'),
        'utf8'
      ));
    } catch (error) {
      settings = {
        downloadPath: path.join(homedir(), 'Downloads'),
        browserCookie: 'chrome'
      };
    }

    const args = ['-J'];
    
    // 添加浏览器 cookie 支持
    if (settings.browserCookie) {
      args.unshift('--cookies-from-browser', settings.browserCookie);
    }
    
    args.push(url);
    
    const proc = spawn('yt-dlp', args);
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      output += data;
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data;
    });

    proc.on('error', (error) => {
      console.error('Failed to spawn yt-dlp:', error);
      res.status(500).json({ error: 'Failed to start yt-dlp process' });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          if (!info || !info.formats) {
            console.error('Invalid video info format:', output);
            return res.status(500).json({ 
              error: 'Invalid video information received',
              details: 'The video information format is invalid or empty'
            });
          }
          
          const formats = info.formats || [];
          if (formats.length === 0) {
            return res.status(500).json({ 
              error: 'No formats available',
              details: 'No downloadable formats found for this video'
            });
          }
          
          const videoFormats = formats
            .filter(f => f.vcodec !== 'none')
            .map(f => ({
              id: f.format_id,
              ext: f.ext,
              resolution: f.resolution,
              fps: f.fps,
              filesize: f.filesize,
              vbr: f.vbr
            }))
            .reverse();

          const audioFormats = formats
            .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
            .map(f => ({
              id: f.format_id,
              ext: f.ext,
              abr: f.abr,
              filesize: f.filesize
            }))
            .reverse();

          if (videoFormats.length === 0 && audioFormats.length === 0) {
            return res.status(500).json({ 
              error: 'No suitable formats found',
              details: 'Could not find any suitable video or audio formats'
            });
          }

          res.json({ videoFormats, audioFormats });
        } catch (error) {
          console.error('Failed to parse video info:', error, 'Output:', output);
          res.status(500).json({ 
            error: 'Failed to parse video info',
            details: error.message
          });
        }
      } else {
        console.error('yt-dlp error output:', errorOutput);
        // Try to extract the most relevant error message
        const errorMessage = errorOutput.split('\n')
          .find(line => line.includes('ERROR:')) || errorOutput.trim();
        res.status(500).json({ 
          error: 'Failed to fetch video formats',
          details: errorMessage || 'Unknown error occurred while fetching video formats'
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 开始下载
app.post('/api/download', async (req, res) => {
  const { url, videoFormat, audioFormat, subtitles } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const settings = JSON.parse(fs.readFileSync(
      path.join(homedir(), '.youtube-downloader-gui', 'settings.json'),
      'utf8'
    ));
    
    const downloadId = nextDownloadId++;
    const args = [
      '--cookies-from-browser', settings.browserCookie || 'chrome',
      '--no-colors',  // 禁用颜色输出以便于解析
      '--progress-template', '[download] %(progress)s',  // 自定义进度输出格式
      url,
      '-f', `${videoFormat}+${audioFormat}`,
      '-P', settings.downloadPath || path.join(homedir(), 'Downloads'),
    ];

    if (subtitles) {
      args.push('--write-subs');
      args.push('--sub-langs', subtitles);
    }

    const proc = spawn('yt-dlp', args);
    let title = '';
    let progress = 0;
    let speed = '';
    let size = '';
    let extractingTitle = false;

    downloads.set(downloadId, {
      id: downloadId,
      title: 'Fetching video information...',
      url,
      progress: 0,
      speed: '',
      size: '',
      status: 'downloading'
    });

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n');
      
      for (const line of lines) {
        // 解析标题
        if (line.includes('[download]') && line.includes('Destination:')) {
          const titleMatch = line.match(/Destination:\s*(.+?)\s*$/);
          if (titleMatch) {
            title = titleMatch[1].replace(/\.[^/.]+$/, ''); // 移除文件扩展名
            downloads.set(downloadId, {
              ...downloads.get(downloadId),
              title
            });
          }
        }
        // 解析进度
        else if (line.includes('[download]')) {
          const progressMatch = line.match(/(\d+\.?\d*)%\s+of\s+(\~?\s*[\d.]+\w+)\s+at\s+([\d.]+\w+\/s)/);
          if (progressMatch) {
            progress = parseFloat(progressMatch[1]);
            size = progressMatch[2].trim();
            speed = progressMatch[3];
            
            downloads.set(downloadId, {
              ...downloads.get(downloadId),
              progress,
              speed,
              size
            });
          }
        }
      }
    });

    // 处理错误输出
    proc.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`Download error (ID ${downloadId}):`, error);
      
      // 如果发生错误但下载仍在继续，更新状态
      if (error.includes('ERROR:')) {
        downloads.set(downloadId, {
          ...downloads.get(downloadId),
          status: 'error',
          error: error.trim()
        });
      }
    });

    proc.on('close', (code) => {
      const download = downloads.get(downloadId);
      downloads.set(downloadId, {
        ...download,
        status: code === 0 ? 'completed' : 'error',
        progress: code === 0 ? 100 : progress,
        error: code !== 0 ? 'Download failed' : undefined
      });
    });

    res.json({ 
      id: downloadId,
      title: 'Fetching video information...',
      url,
      progress: 0,
      status: 'downloading'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取下载状态
app.get('/api/downloads', (req, res) => {
  res.json(Array.from(downloads.values()));
});

// 删除下载记录
app.delete('/api/downloads/:id', (req, res) => {
  const id = parseInt(req.params.id);
  downloads.delete(id);
  res.json({ success: true });
});

// 添加文件选择器 API
app.get('/api/select-directory', (req, res) => {
  const platform = process.platform;
  
  if (platform === 'darwin') {  // macOS
    exec('osascript -e \'choose folder with prompt "Select Download Location:"\' 2>/dev/null', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to open directory picker:', error);
        return res.status(500).json({ error: 'Failed to open directory picker' });
      }
      // 移除输出中的 'alias ' 前缀和换行符
      const selectedPath = stdout.trim().replace(/^alias /, '');
      res.json({ path: selectedPath });
    });
  } else if (platform === 'win32') {  // Windows
    // Windows 的文件选择器命令
    const command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog; $folderBrowser.Description = 'Select Download Location'; $folderBrowser.ShowDialog(); $folderBrowser.SelectedPath"`;
    
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to open directory picker:', error);
        return res.status(500).json({ error: 'Failed to open directory picker' });
      }
      const selectedPath = stdout.trim();
      res.json({ path: selectedPath });
    });
  } else {  // Linux
    // Linux 的文件选择器命令
    exec('zenity --file-selection --directory --title="Select Download Location"', (error, stdout, stderr) => {
      if (error && error.code !== 1) {  // code 1 means user cancelled
        console.error('Failed to open directory picker:', error);
        return res.status(500).json({ error: 'Failed to open directory picker' });
      }
      const selectedPath = stdout.trim();
      res.json({ path: selectedPath });
    });
  }
});

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(port, () => {
  console.log(`YouTube Downloader GUI running at http://localhost:${port}`);
  // 初始化设置
  initializeSettings();
  // 在默认浏览器中打开应用
  open(`http://localhost:${port}`);
}); 