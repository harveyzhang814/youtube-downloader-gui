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
      return TaskManager.getTask(taskId);
    });

    // 更新任务
    ipcMain.handle('task:update', async (event, taskId, update) => {
      return TaskManager.updateTask(taskId, update);
    });

    // 删除任务
    ipcMain.handle('task:delete', async (event, taskId) => {
      TaskManager.deleteTask(taskId);
      return true;
    });

    // 扫描所有任务
    ipcMain.handle('task:scan', async () => {
      return TaskManager.scanTasks();
    });

    // 启动任务调度
    ipcMain.handle('task:start', async (event, taskId) => {
      const win = event.sender.getOwnerBrowserWindow();
      await TaskManager.startTask(taskId, win);
      return true;
    });

    // 断点续传任务
    ipcMain.handle('task:resume', async (event, taskId) => {
      const win = event.sender.getOwnerBrowserWindow();
      await TaskManager.resumeTask(taskId, win);
      return true;
    });

    // 获取全部设置
    ipcMain.handle('settings:get', async () => {
      return SettingsManager.getSettings();
    });

    // 修改全部设置
    ipcMain.handle('settings:set', async (event, newSettings) => {
      SettingsManager.setSettings(newSettings);
      return true;
    });

    // 获取下载目录
    ipcMain.handle('settings:getDownloadLocation', async () => {
      return SettingsManager.getDownloadLocation();
    });

    // 设置下载目录
    ipcMain.handle('settings:setDownloadLocation', async (event, newPath) => {
      SettingsManager.setDownloadLocation(newPath);
      return true;
    });

    // 获取 Cookie Source
    ipcMain.handle('settings:getCookieSource', async () => {
      return SettingsManager.getCookieSource();
    });

    // 设置 Cookie Source
    ipcMain.handle('settings:setCookieSource', async (event, newSource) => {
      SettingsManager.setCookieSource(newSource);
      return true;
    });

    // 选择目录弹窗
    ipcMain.handle('dialog:chooseDirectory', async () => {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      return result.canceled ? null : result.filePaths[0];
    });

    // 打开指定相对路径的文件夹
    ipcMain.handle('open-location', async (event, relativePath) => {
      const path = require('path');
      const rootDir = SettingsManager.getDownloadLocation();
      const absPath = path.join(rootDir, relativePath);
      await shell.openPath(absPath);
      return true;
    });
  }
}

module.exports = IPCHandler; 