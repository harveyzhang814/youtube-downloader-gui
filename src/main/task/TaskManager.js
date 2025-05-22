/**
 * TaskManager 模块
 * 负责下载任务列表的管理，包括扫描目录获取任务列表等功能。
 * 依赖 FileManager 进行文件和目录操作，依赖 SettingsManager 获取 Default Download Location。
 */

const path = require('path');
const FileManager = require('./FileManager');
const SettingsManager = require('./SettingsManager');
const fs = require('fs');
const Task = require('./Task');
const { app } = require('electron');

class TaskManager {
  /**
   * 统一的错误响应格式
   * @param {Error} error - 错误对象
   * @param {string} taskId - 任务ID（可选）
   * @returns {Object} 标准化的错误响应
   */
  static createErrorResponse(error, taskId = null) {
    return {
      success: false,
      taskId,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
  }

  /**
   * 统一的成功响应格式
   * @param {any} data - 响应数据
   * @param {string} taskId - 任务ID（可选）
   * @returns {Object} 标准化的成功响应
   */
  static createSuccessResponse(data, taskId = null) {
    return {
      success: true,
      taskId,
      data
    };
  }

  /**
   * 检查并修复下载目录
   * @returns {Promise<string>} 有效的下载目录路径
   */
  static async checkAndFixDownloadDirectory() {
    let downloadPath = SettingsManager.getDownloadLocation();
    
    // 检查目录是否存在
    if (!fs.existsSync(downloadPath)) {
      try {
        // 尝试创建目录
        fs.mkdirSync(downloadPath, { recursive: true });
      } catch (error) {
        // 如果创建失败，使用系统默认下载目录
        downloadPath = app.getPath('downloads');
        // 更新设置
        SettingsManager.setDownloadLocation(downloadPath);
      }
    }
    
    return downloadPath;
  }

  /**
   * 扫描所有 .ytd 文件，返回任务列表
   * @returns {Array<Object>} 任务对象数组
   */
  static async scanTasks() {
    try {
      // 检查并修复下载目录
      const rootDir = await this.checkAndFixDownloadDirectory();
      
      // 读取根目录下所有 .ytd 文件
      const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.ytd'));
      // 解析所有任务对象
      const tasks = await Promise.all(files.map(async f => {
        try {
          const taskId = f.replace('.ytd', '');
          const task = new Task(taskId);
          return await task.read();
        } catch (error) {
          console.error(`Error reading task ${f}:`, error);
          return null;
        }
      }));
      return this.createSuccessResponse(tasks.filter(Boolean));
    } catch (error) {
      console.error('Error scanning tasks:', error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * 创建新任务
   * @param {Object} settings - 任务参数，来自前端弹窗
   * @returns {Promise<Object>} 新创建的任务数据
   */
  static async createTask(settings) {
    try {
      const task = await Task.create(settings);
      const taskData = await task.read();
      return this.createSuccessResponse(taskData, task.id);
    } catch (error) {
      console.error('Error creating task:', error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * 获取任务实例
   * @param {string} taskId
   * @returns {Task} 任务实例
   */
  static getTask(taskId) {
    return new Task(taskId);
  }

  /**
   * 更新任务
   * @param {string} taskId - 任务ID
   * @param {Object} update - 更新内容
   * @returns {Promise<Object>} 更新后的任务数据
   */
  static async updateTask(taskId, update) {
    try {
      const task = this.getTask(taskId);
      const updatedData = await task.update(update);
      return this.createSuccessResponse(updatedData, taskId);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      return this.createErrorResponse(error, taskId);
    }
  }

  /**
   * 删除任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 删除结果
   */
  static async deleteTask(taskId) {
    try {
      const task = this.getTask(taskId);
      await task.delete();
      return this.createSuccessResponse({ deleted: true }, taskId);
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      return this.createErrorResponse(error, taskId);
    }
  }

  /**
   * 启动任务
   * @param {string} taskId - 任务ID
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<Object>} 启动结果
   */
  static async startTask(taskId, win) {
    try {
      const task = this.getTask(taskId);
      await task.start(win);
      return this.createSuccessResponse({
        started: true,
        startTime: new Date().toISOString()
      }, taskId);
    } catch (error) {
      console.error(`Error starting task ${taskId}:`, error);
      return this.createErrorResponse(error, taskId);
    }
  }

  /**
   * 断点续传任务
   * @param {string} taskId - 任务ID
   * @param {BrowserWindow} win - 主窗口实例
   * @returns {Promise<Object>} 续传结果
   */
  static async resumeTask(taskId, win) {
    try {
      const task = this.getTask(taskId);
      await task.resume(win);
      return this.createSuccessResponse({
        resumed: true,
        resumeTime: new Date().toISOString()
      }, taskId);
    } catch (error) {
      console.error(`Error resuming task ${taskId}:`, error);
      return this.createErrorResponse(error, taskId);
    }
  }
}

module.exports = TaskManager; 