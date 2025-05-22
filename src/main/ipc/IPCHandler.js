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
 */

const { ipcMain, shell, dialog } = require('electron');
const TaskManager = require('../task/TaskManager');
const SettingsManager = require('../task/SettingsManager');

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
  }
}

module.exports = IPCHandler; 