/**
 * Task 类
 * 负责单个任务的生命周期管理，包括创建、读取、更新、删除、断点续传等功能。
 * 依赖 FileManager 进行文件和目录操作，依赖 SettingsManager 获取 Default Download Location。
 */

const path = require('path');
const FileManager = require('./FileManager');
const SettingsManager = require('./SettingsManager');
const TaskRunner = require('./TaskRunner');

class Task {
  /**
   * @param {string} taskId - 任务ID
   * @param {Object} taskData - 任务数据对象
   */
  constructor(taskId, taskData = null) {
    this.id = taskId;
    this.rootDir = SettingsManager.getDownloadLocation();
    this.ytdFile = path.join(this.rootDir, `${taskId}.ytd`);
    this.tempDir = path.join(this.rootDir, taskId);
    
    if (taskData) {
      this.data = taskData;
    } else {
      this.data = FileManager.readJson(this.ytdFile);
    }
  }

  /**
   * 创建新任务
   * @param {Object} settings - 任务参数，来自前端弹窗
   * @returns {Task} 新创建的任务实例
   */
  static create(settings) {
    const taskId = Task.generateHash(settings.url + Date.now());
    const title = settings.title || 'Untitled';
    const rootDir = SettingsManager.getDownloadLocation();
    const tempDir = taskId;
    const ytdFile = `${taskId}.ytd`;

    const taskData = {
      id: taskId,
      title,
      status: 'running',
      currentStep: 'fetch_info',
      outputDir: null,
      tempDir,
      steps: [
        { name: 'fetch_info', status: 'pending' },
        { name: 'download_video', status: 'pending' },
        { name: 'download_audio', status: 'pending' },
        { name: 'merge', status: 'pending' }
      ],
      createdAt: new Date().toISOString(),
      settings
    };

    // 创建临时文件夹
    FileManager.createDir(path.join(rootDir, tempDir));
    // 写入 .ytd 文件
    FileManager.writeJson(path.join(rootDir, ytdFile), taskData);

    return new Task(taskId, taskData);
  }

  /**
   * 读取任务信息
   * @returns {Object|null} 任务数据对象
   */
  read() {
    return this.data;
  }

  /**
   * 更新任务信息
   * @param {Object} update - 要更新的字段
   * @returns {Object|null} 更新后的任务数据对象
   */
  update(update) {
    if (!this.data) return null;
    Object.assign(this.data, update);
    FileManager.writeJson(this.ytdFile, this.data);
    return this.data;
  }

  /**
   * 删除任务及相关文件夹
   */
  delete() {
    // 删除 .ytd 文件
    FileManager.removeFile(this.ytdFile);
    // 删除临时文件夹
    FileManager.removeDir(this.tempDir);
    // 删除最终输出文件夹
    if (this.data && this.data.title) {
      const outputDir = path.join(this.rootDir, this.data.title);
      FileManager.removeDir(outputDir);
    }
  }

  /**
   * 启动/恢复任务调度
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<void>}
   */
  async start(win) {
    if (!this.data) return;
    const runner = new TaskRunner(this.data, updatedTask => {
      this.update(updatedTask);
    }, win);
    await runner.run();
  }

  /**
   * 断点续传任务
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<void>}
   */
  async resume(win) {
    this.resumeStatusOnly();
    await this.start(win);
  }

  /**
   * 仅重置失败节点，不调度
   */
  resumeStatusOnly() {
    if (!this.data) return;
    let interrupted = false;
    for (const step of this.data.steps) {
      if (step.status === 'failed' || step.status === 'interrupted') {
        interrupted = true;
        step.status = 'pending';
      } else if (interrupted) {
        step.status = 'pending';
      }
    }
    this.data.status = 'running';
    this.update(this.data);
  }

  /**
   * 生成任务 hash
   * @param {string} str - 用于生成 hash 的字符串
   * @returns {string} hash 字符串
   */
  static generateHash(str) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  }
}

module.exports = Task; 