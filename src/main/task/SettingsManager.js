/**
 * SettingsManager 模块
 * 负责 Default Download Location 等全局设置的读取、修改、持久化。
 * 所有设置存储在 settings.json 文件中（与本模块同级目录）。
 *
 * 提供方法：
 *   - getDownloadLocation(): 获取当前下载根目录
 *   - setDownloadLocation(newPath): 设置新的下载根目录
 *   - getSettings(): 获取全部设置
 *   - setSettings(newSettings): 覆盖全部设置
 */

const path = require('path');
const fs = require('fs');

// 设置文件名，存储于 task 目录下
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

class SettingsManager {
  /**
   * 获取全部设置（如不存在则返回默认设置）
   * @returns {Object} settings
   */
  static getSettings() {
    // 检查 settings.json 是否存在
    if (fs.existsSync(SETTINGS_FILE)) {
      // 存在则读取并解析
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
    // 不存在则返回默认设置
    return {
      downloadLocation: path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads')
    };
  }

  /**
   * 获取当前 Default Download Location
   * @returns {string} 绝对路径
   */
  static getDownloadLocation() {
    // 读取设置中的 downloadLocation 字段
    return this.getSettings().downloadLocation;
  }

  /**
   * 设置新的 Default Download Location
   * @param {string} newPath - 新的绝对路径
   */
  static setDownloadLocation(newPath) {
    // 读取当前设置
    const settings = this.getSettings();
    // 更新 downloadLocation 字段
    settings.downloadLocation = newPath;
    // 写回 settings.json
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * 覆盖全部设置
   * @param {Object} newSettings - 新的设置对象
   */
  static setSettings(newSettings) {
    // 写回 settings.json
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), 'utf-8');
  }

  /**
   * 获取当前 Cookie Source
   * @returns {string}
   */
  static getCookieSource() {
    return this.getSettings().cookieSource || 'chrome';
  }

  /**
   * 设置新的 Cookie Source
   * @param {string} newSource
   */
  static setCookieSource(newSource) {
    const settings = this.getSettings();
    settings.cookieSource = newSource;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  }
}

module.exports = SettingsManager; 