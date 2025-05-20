/**
 * TaskManager 模块
 * 负责下载任务的创建、读取、更新、删除、断点续传、任务扫描等核心功能。
 * 依赖 FileManager 进行文件和目录操作，依赖 SettingsManager 获取 Default Download Location。
 * 所有任务信息存储为 .ytd 文件，所有路径均为相对 Default Download Location 的相对路径。
 *
 * 提供方法：
 *   - createTask(settings): 创建新任务
 *   - getTask(taskId): 读取任务信息
 *   - updateTask(taskId, update): 更新任务信息
 *   - deleteTask(taskId): 删除任务及相关文件夹
 *   - scanTasks(): 扫描所有 .ytd 文件，返回任务列表
 *   - resumeTask(taskId): 断点续传（仅管理状态，实际下载逻辑由外部实现）
 */

const path = require('path');
const FileManager = require('./FileManager');
const SettingsManager = require('./SettingsManager');
const crypto = require('crypto');
const TaskRunner = require('./TaskRunner');
const fs = require('fs');

class TaskManager {
  /**
   * 创建新任务
   * @param {Object} settings - 任务参数，来自前端弹窗
   * @returns {Object} 任务对象
   */
  static createTask(settings) {
    // 生成唯一 hash 作为任务 id
    const taskId = TaskManager.generateHash(settings.url + Date.now());
    // 任务 title 由前端传入或解析
    const title = settings.title || 'Untitled';
    // 获取根目录
    const rootDir = SettingsManager.getDownloadLocation();
    // 临时文件夹和 .ytd 文件的相对路径
    const tempDir = taskId;
    const ytdFile = `${taskId}.ytd`;

    // 构造初始任务对象
    const task = {
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
    FileManager.writeJson(path.join(rootDir, ytdFile), task);

    return task;
  }

  /**
   * 读取任务信息
   * @param {string} taskId
   * @returns {Object|null} 任务对象或 null
   */
  static getTask(taskId) {
    const rootDir = SettingsManager.getDownloadLocation();
    const ytdFile = path.join(rootDir, `${taskId}.ytd`);
    return FileManager.readJson(ytdFile);
  }

  /**
   * 更新任务信息（只更新部分字段）
   * @param {string} taskId
   * @param {Object} update - 要更新的字段
   * @returns {Object|null} 更新后的任务对象或 null
   */
  static updateTask(taskId, update) {
    const rootDir = SettingsManager.getDownloadLocation();
    const ytdFile = path.join(rootDir, `${taskId}.ytd`);
    const task = FileManager.readJson(ytdFile);
    if (!task) return null;
    // 合并更新字段
    Object.assign(task, update);
    FileManager.writeJson(ytdFile, task);
    return task;
  }

  /**
   * 删除任务及相关文件夹
   * @param {string} taskId
   */
  static deleteTask(taskId) {
    const rootDir = SettingsManager.getDownloadLocation();
    const ytdFile = path.join(rootDir, `${taskId}.ytd`);
    const tempDir = path.join(rootDir, taskId);
    // 删除 .ytd 文件
    FileManager.removeFile(ytdFile);
    // 删除临时文件夹
    FileManager.removeDir(tempDir);
    // 删除最终输出文件夹（以任务 title 命名）
    // 先读取 .ytd 文件内容获取 title
    let title = null;
    try {
      const task = FileManager.readJson(ytdFile);
      if (task && task.title) title = task.title;
    } catch {}
    if (title) {
      const outputDir = path.join(rootDir, title);
      FileManager.removeDir(outputDir);
    }
  }

  /**
   * 扫描所有 .ytd 文件，返回任务列表
   * @returns {Array<Object>} 任务对象数组
   */
  static scanTasks() {
    const rootDir = SettingsManager.getDownloadLocation();
    // 读取根目录下所有 .ytd 文件
    const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.ytd'));
    // 解析所有任务对象
    return files.map(f => FileManager.readJson(path.join(rootDir, f))).filter(Boolean);
  }

  /**
   * 启动/恢复任务调度
   * @param {string} taskId
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<void>}
   */
  static async startTask(taskId, win) {
    const rootDir = SettingsManager.getDownloadLocation();
    const ytdFile = path.join(rootDir, `${taskId}.ytd`);
    let task = FileManager.readJson(ytdFile);
    if (!task) return;
    // 创建TaskRunner，onUpdate时写回ytd文件
    const runner = new TaskRunner(task, updatedTask => {
      FileManager.writeJson(ytdFile, updatedTask);
    }, win);
    await runner.run();
  }

  /**
   * 断点续传任务（重置失败节点后调度）
   * @param {string} taskId
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<void>}
   */
  static async resumeTask(taskId, win) {
    // 先重置失败节点
    this.resumeTaskStatusOnly(taskId);
    // 再调度
    await this.startTask(taskId, win);
  }

  /**
   * 仅重置失败节点，不调度
   * @param {string} taskId
   */
  static resumeTaskStatusOnly(taskId) {
    const rootDir = SettingsManager.getDownloadLocation();
    const ytdFile = path.join(rootDir, `${taskId}.ytd`);
    const task = FileManager.readJson(ytdFile);
    if (!task) return;
    let interrupted = false;
    for (const step of task.steps) {
      if (step.status === 'failed' || step.status === 'interrupted') {
        interrupted = true;
        step.status = 'pending';
      } else if (interrupted) {
        step.status = 'pending';
      }
    }
    task.status = 'running';
    FileManager.writeJson(ytdFile, task);
  }

  /**
   * 生成任务 hash
   * @param {string} str - 用于生成 hash 的字符串
   * @returns {string} hash 字符串
   */
  static generateHash(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }
}

module.exports = TaskManager; 