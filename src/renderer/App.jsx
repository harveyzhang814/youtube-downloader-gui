import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Toolbar from './components/Toolbar';
import DownloadList from './components/DownloadList';
import NewTaskModal from './components/NewTaskModal';
import Settings from './components/Settings';
import DependencyCheck from './components/DependencyCheck';

// 修正 Electron 的 ipcRenderer 引用，确保在 Electron 环境下可用
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

/**
 * 应用主组件，负责页面结构、状态管理、与主进程通信。
 */
const App = () => {
  // 下载任务列表
  const [downloads, setDownloads] = useState([]);
  // 新建任务弹窗显示状态
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  // 设置面板显示状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 依赖检测结果
  const [dependencies, setDependencies] = useState({ ytdlp: true, ffmpeg: true });
  // 依赖检测弹窗显示状态
  const [dependencyCheckShown, setDependencyCheckShown] = useState(false);

  /**
   * 组件挂载时注册主进程事件监听，卸载时清理。
   * 监听依赖检测、下载进度、下载完成等事件，更新前端状态。
   */
  useEffect(() => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }

    // 监听依赖检测结果
    ipcRenderer.on('dependencies-check', (_, deps) => {
      setDependencies(deps);
      if (!deps.ytdlp || !deps.ffmpeg) {
        setDependencyCheckShown(true);
      }
    });

    // 监听新下载任务开始
    ipcRenderer.on('download-started', (_, downloadInfo) => {
      setDownloads(prev => [...prev, downloadInfo]);
    });

    // 监听下载进度更新
    ipcRenderer.on('download-progress', (_, downloadInfo) => {
      setDownloads(prev => 
        prev.map(download => 
          download.id === downloadInfo.id ? downloadInfo : download
        )
      );
    });

    // 监听下载完成
    ipcRenderer.on('download-finished', (_, downloadInfo) => {
      setDownloads(prev => 
        prev.map(download => 
          download.id === downloadInfo.id ? downloadInfo : download
        )
      );
    });

    // 卸载时清理所有监听器，防止内存泄漏
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('dependencies-check');
        ipcRenderer.removeAllListeners('download-started');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('download-finished');
      }
    };
  }, []);

  /**
   * 启动新下载任务。
   * @param {Object} settings - 新任务的设置参数
   */
  const handleStartDownload = async (settings) => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    try {
      // 1. 创建任务（如有任务管理模块）
      const task = await ipcRenderer.invoke('task:create', settings);
      // 2. 启动任务
      await ipcRenderer.invoke('task:start', task.id);
      setIsNewTaskModalOpen(false);
      // DownloadList 会自动刷新任务列表
    } catch (error) {
      console.error('Task creation/start failed:', error);
    }
  };

  /**
   * 删除下载任务（仅前端移除）。
   * @param {string} downloadId - 任务ID
   */
  const handleDeleteDownload = (downloadId) => {
    setDownloads(prev => prev.filter(download => download.id !== downloadId));
  };

  /**
   * 打开文件所在文件夹。
   * @param {string} filePath - 文件路径
   */
  const handleOpenFileLocation = async (filePath) => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    await ipcRenderer.invoke('open-file-location', filePath);
  };

  /**
   * 关闭依赖检测弹窗。
   */
  const closeDependencyCheck = () => {
    setDependencyCheckShown(false);
  };

  // 渲染主界面结构，包括标题栏、工具栏、下载列表、设置面板、弹窗等
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#f5f5f7'
    }}>
      {/* 顶部标题栏 */}
      <TitleBar />
      
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* 工具栏，包含新建任务和设置按钮 */}
        <Toolbar 
          onNewTask={() => setIsNewTaskModalOpen(true)} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
        />
        
        <div style={{ 
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative'
        }}>
          <div style={{ 
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'margin-right 0.3s ease',
            marginRight: isSettingsOpen ? '300px' : '0'
          }}>
            {/* 路由配置，主页面为下载列表 */}
            <Routes>
              <Route 
                path="/" 
                element={
                  <DownloadList 
                    onDelete={handleDeleteDownload}
                    onOpenLocation={handleOpenFileLocation}
                  />
                } 
              />
            </Routes>
          </div>
          
          {/* 右侧设置面板，固定宽度 */}
          {isSettingsOpen && (
            <div style={{
              position: 'fixed',
              top: '38px', // TitleBar 高度
              right: 0,
              bottom: 0,
              width: '300px',
              backgroundColor: 'white',
              boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Settings onClose={() => setIsSettingsOpen(false)} />
            </div>
          )}
        </div>
      </div>

      {/* 新建任务弹窗 */}
      {isNewTaskModalOpen && (
        <NewTaskModal 
          onClose={() => setIsNewTaskModalOpen(false)}
          onSubmit={handleStartDownload}
        />
      )}

      {/* 依赖检测弹窗 */}
      {dependencyCheckShown && (
        <DependencyCheck 
          dependencies={dependencies} 
          onClose={closeDependencyCheck} 
        />
      )}
    </div>
  );
};

export default App; 