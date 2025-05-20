/**
 * TaskRunner 模块
 * 负责单个任务的调度与执行，支持断点续传、步骤状态更新、失败中断、全部成功后完成。
 * 依赖 TaskManager 进行任务状态持久化。
 * 步骤已集成yt-dlp和ffmpeg命令，支持下载视频、音频、字幕并合并/嵌入字幕。
 * 支持主进程推送实时进度到前端。
 */

const path = require('path');
const { spawn } = require('child_process');
const SettingsManager = require('./SettingsManager');
const FileManager = require('./FileManager');

/**
 * 执行命令并等待完成
 * @param {string} cmd
 * @param {string[]} args
 * @param {object} options
 */
function runCommand(cmd, args, options = {}, progressCb) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    // 新增：打印 stdout
    child.stdout.on('data', data => {
      console.log(`[${cmd} stdout]`, data.toString());
    });
    // 新增：打印 stderr
    child.stderr.on('data', data => {
      console.log(`[${cmd} stderr]`, data.toString());
      const str = data.toString();
      // yt-dlp 进度解析
      const ytdlpMatch = str.match(/\b(\d{1,3}\.\d)%/);
      if (ytdlpMatch) {
        progressCb && progressCb(parseFloat(ytdlpMatch[1]));
      }
      // ffmpeg 进度解析（可扩展）
      const ffmpegMatch = str.match(/time=([\d:.]+)/);
      if (ffmpegMatch) {
        progressCb && progressCb(null, ffmpegMatch[1]);
      }
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

class TaskRunner {
  /**
   * @param {Object} task - 任务对象
   * @param {Function} onUpdate - 状态变更回调（如写入ytd文件）
   * @param {BrowserWindow} win - 主窗口实例
   */
  constructor(task, onUpdate, win) {
    this.task = task;
    this.onUpdate = onUpdate;
    this.win = win;
  }

  emitProgress(data) {
    if (this.win && this.win.webContents) {
      this.win.webContents.send('task:progress', { taskId: this.task.id, ...data });
    }
  }

  /**
   * 执行任务（支持断点续传）
   */
  async run() {
    for (let i = 0; i < this.task.steps.length; i++) {
      const step = this.task.steps[i];
      if (step.status === 'success') continue; // 跳过已完成
      try {
        step.status = 'running';
        this.onUpdate(this.task);
        // 执行具体步骤
        await this.runStep(step.name);
        step.status = 'success';
        this.onUpdate(this.task);
      } catch (e) {
        step.status = 'failed';
        step.error = e.message;
        this.task.status = 'interrupted';
        this.onUpdate(this.task);
        break;
      }
    }
    // 全部成功后，更新任务状态为 completed
    if (this.task.steps.every(s => s.status === 'success')) {
      this.task.status = 'completed';
      this.onUpdate(this.task);
    }
    console.log('[TaskRunner] 任务全部步骤执行完毕，状态：', this.task.status);
  }

  /**
   * 执行单个步骤
   * @param {string} stepName
   */
  async runStep(stepName) {
    switch (stepName) {
      case 'fetch_info':
        await this.fetchInfo();
        break;
      case 'download_video':
        await this.downloadVideo();
        break;
      case 'download_audio':
        await this.downloadAudio();
        break;
      case 'download_subtitles':
        await this.downloadSubtitles();
        break;
      case 'merge':
        await this.mergeAV();
        break;
      case 'embed_subtitles':
        await this.embedSubtitles();
        break;
      default:
        throw new Error('未知步骤: ' + stepName);
    }
  }

  /**
   * mock步骤，延迟1秒
   * @param {string} desc
   */
  async mockStep(desc) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * 获取视频信息，更新任务 title
   */
  async fetchInfo() {
    const { url } = this.task.settings;
    const cookieSource = SettingsManager.getCookieSource();
    const args = ['--cookies-from-browser', cookieSource, '--dump-json', url];
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args);
      let data = '';
      child.stdout.on('data', chunk => data += chunk);
      child.stderr.on('data', chunk => {
        console.log('[yt-dlp fetch_info stderr]', chunk.toString());
      });
      child.on('close', code => {
        if (code === 0) {
          try {
            const info = JSON.parse(data);
            // 更新任务 title
            this.task.title = info.title || 'Untitled';
            // 写入 .ytd 文件
            this.onUpdate(this.task);
            resolve(info);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error('yt-dlp exited with code ' + code));
        }
      });
      child.on('error', reject);
    });
  }

  /**
   * 下载视频流（仅视频）
   */
  async downloadVideo() {
    const { url, video } = this.task.settings;
    const tempDir = this.task.tempDir;
    const rootDir = SettingsManager.getDownloadLocation();
    const cookieSource = SettingsManager.getCookieSource();
    const outPath = path.join(rootDir, tempDir, 'video_download.mp4');
    const args = [
      '--cookies-from-browser', cookieSource,
      url,
      '-f', video.id,
      '-o', outPath
    ];
    console.log('[TaskRunner] 执行 yt-dlp 下载视频命令: yt-dlp', args.join(' '));
    await runCommand('yt-dlp', args, {}, (progress) => {
      if (progress !== undefined) {
        this.emitProgress({ step: 'download_video', progress });
      }
    });
  }

  /**
   * 下载音频流（仅音频）
   */
  async downloadAudio() {
    const { url, audio } = this.task.settings;
    const tempDir = this.task.tempDir;
    const rootDir = SettingsManager.getDownloadLocation();
    const cookieSource = SettingsManager.getCookieSource();
    const outPath = path.join(rootDir, tempDir, 'audio_download.m4a');
    const args = [
      '--cookies-from-browser', cookieSource,
      url,
      '-f', audio.id,
      '-o', outPath
    ];
    console.log('[TaskRunner] 执行 yt-dlp 下载音频命令: yt-dlp', args.join(' '));
    await runCommand('yt-dlp', args, {}, (progress) => {
      if (progress !== undefined) {
        this.emitProgress({ step: 'download_audio', progress });
      }
    });
  }

  /**
   * 下载字幕（支持多语言）
   */
  async downloadSubtitles() {
    const { url, subtitles } = this.task.settings;
    if (!subtitles || !subtitles.languages || subtitles.languages.length === 0) return;
    const tempDir = this.task.tempDir;
    const rootDir = SettingsManager.getDownloadLocation();
    const outPath = path.join(rootDir, tempDir, 'subtitles.%(ext)s');
    const langList = subtitles.languages.join(',');
    const args = [
      '--write-subs',
      '--sub-langs', langList,
      '--write-auto-sub',
      '--skip-download',
      url,
      '-o', outPath
    ];
    console.log('[TaskRunner] 执行 yt-dlp 下载字幕命令: yt-dlp', args.join(' '));
    await runCommand('yt-dlp', args, {}, (progress) => {
      this.emitProgress({ step: 'download_subtitles', progress: null });
    });
  }

  /**
   * 合并音视频
   */
  async mergeAV() {
    const tempDir = this.task.tempDir;
    const rootDir = SettingsManager.getDownloadLocation();
    const videoPath = path.join(rootDir, tempDir, 'video_download.mp4');
    const audioPath = path.join(rootDir, tempDir, 'audio_download.m4a');
    const outputDir = path.join(rootDir, this.task.title);
    const outputPath = path.join(outputDir, 'final_video.mp4');
    FileManager.createDir(outputDir);
    const args = [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      outputPath
    ];
    console.log('[TaskRunner] 执行 ffmpeg 合并命令: ffmpeg', args.join(' '));
    await runCommand('ffmpeg', args, {}, (progress, ffmpegTime) => {
      this.emitProgress({ step: 'merge', progress: null, ffmpegTime });
    });
    console.log('[TaskRunner] ffmpeg 合并已完成，准备返回');
  }

  /**
   * 嵌入字幕（支持所有下载的多语言字幕）
   */
  async embedSubtitles() {
    const { subtitles } = this.task.settings;
    if (!subtitles || !subtitles.languages || subtitles.languages.length === 0) return;
    const tempDir = this.task.tempDir;
    const rootDir = SettingsManager.getDownloadLocation();
    const outputDir = path.join(rootDir, this.task.title);
    const videoPath = path.join(outputDir, 'final_video.mp4');
    const outputPath = path.join(outputDir, 'final_with_subs.mp4');

    // 构建输入参数
    const inputArgs = ['-i', videoPath];
    const mapArgs = ['-map', '0:v', '-map', '0:a'];
    const metadataArgs = [];
    let subIdx = 0;

    for (const lang of subtitles.languages) {
      const subPath = path.join(rootDir, tempDir, `subtitles.${lang}.vtt`);
      inputArgs.push('-i', subPath);
      mapArgs.push('-map', `${subIdx + 1}:0`); // 第一个字幕输入是1:0，第二个2:0...
      metadataArgs.push(`-metadata:s:s:${subIdx} language=${lang}`);
      subIdx++;
    }

    // 构建完整参数
    const args = [
      ...inputArgs,
      ...mapArgs,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-c:s', 'mov_text', // mp4内嵌字幕
      ...metadataArgs,
      outputPath
    ];

    await runCommand('ffmpeg', args, {}, (progress, ffmpegTime) => {
      this.emitProgress({ step: 'embed_subtitles', progress: null, ffmpegTime });
    });
  }
}

module.exports = TaskRunner; 