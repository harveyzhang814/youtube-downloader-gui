/**
 * FileManager 模块
 * 负责所有文件和目录的创建、移动、删除、校验、JSON读写等操作。
 * 所有路径均为相对 Default Download Location 的相对路径，由调用方拼接绝对路径。
 *
 * 提供方法：
 *   - createDir(dirPath): 创建目录（如不存在）
 *   - removeDir(dirPath): 删除目录及其所有内容
 *   - moveFile(src, dest): 移动文件
 *   - removeFile(filePath): 删除文件
 *   - writeJson(filePath, data): 写入 JSON 文件
 *   - readJson(filePath): 读取 JSON 文件
 *   - exists(path): 判断文件或目录是否存在
 */

const fs = require('fs');
const path = require('path');

class FileManager {
  /**
   * 创建目录（如果不存在）
   * @param {string} dirPath - 绝对路径
   */
  static createDir(dirPath) {
    // 检查目录是否存在，不存在则递归创建
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 删除目录及其所有内容
   * @param {string} dirPath - 绝对路径
   */
  static removeDir(dirPath) {
    // 检查目录是否存在
    if (fs.existsSync(dirPath)) {
      // 递归删除目录及内容
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * 移动文件
   * @param {string} src - 源文件绝对路径
   * @param {string} dest - 目标文件绝对路径
   */
  static moveFile(src, dest) {
    // 确保目标目录存在
    const destDir = path.dirname(dest);
    this.createDir(destDir);
    // 移动文件
    fs.renameSync(src, dest);
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件绝对路径
   */
  static removeFile(filePath) {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * 写入 JSON 文件
   * @param {string} filePath - 文件绝对路径
   * @param {Object} data - 要写入的数据
   */
  static writeJson(filePath, data) {
    // 将对象序列化为 JSON 字符串并写入文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 读取 JSON 文件
   * @param {string} filePath - 文件绝对路径
   * @returns {Object|null} 解析后的对象，失败返回 null
   */
  static readJson(filePath) {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      try {
        // 读取并解析 JSON 文件
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        // 解析失败返回 null
        return null;
      }
    }
    // 文件不存在返回 null
    return null;
  }

  /**
   * 判断文件或目录是否存在
   * @param {string} targetPath - 绝对路径
   * @returns {boolean}
   */
  static exists(targetPath) {
    return fs.existsSync(targetPath);
  }
}

module.exports = FileManager; 