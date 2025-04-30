import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Toolbar from './components/Toolbar';
import DownloadList from './components/DownloadList';
import NewTaskModal from './components/NewTaskModal';
import Settings from './components/Settings';
import DependencyCheck from './components/DependencyCheck';

const App = () => {
  const [downloads, setDownloads] = useState([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dependencies, setDependencies] = useState({ ytdlp: false, ffmpeg: false });
  const [dependencyCheckShown, setDependencyCheckShown] = useState(false);
  const [dependencyError, setDependencyError] = useState(null);

  useEffect(() => {
    // 检查依赖
    const checkDependencies = async () => {
      try {
        console.log('Checking dependencies...');
        const response = await fetch('/api/check-dependencies');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || 'Failed to check dependencies');
        }
        const deps = await response.json();
        console.log('Dependencies check result:', deps);
      setDependencies(deps);
      if (!deps.ytdlp || !deps.ffmpeg) {
        setDependencyCheckShown(true);
      }
      } catch (error) {
        console.error('Dependencies check failed:', error);
        setDependencyError(error.message);
        setDependencyCheckShown(true);
      }
    };

    checkDependencies();

    // 轮询下载状态
    const pollInterval = setInterval(() => {
      fetch('/api/downloads')
        .then(res => res.json())
        .then(setDownloads)
        .catch(console.error);
    }, 1000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleStartDownload = async (downloadData) => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(downloadData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Download failed');
      }
      
      const result = await response.json();
      console.log('Download started:', result);
      
      // 添加新的下载到列表中
      setDownloads(prev => [...prev, result]);
      setIsNewTaskModalOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const handleDeleteDownload = async (downloadId) => {
    try {
      await fetch(`/api/downloads/${downloadId}`, {
        method: 'DELETE',
      });
    setDownloads(prev => prev.filter(download => download.id !== downloadId));
    } catch (error) {
      console.error('Failed to delete download:', error);
    }
  };

  const handleOpenFileLocation = async (filePath) => {
    // 在浏览器环境中，我们无法直接打开文件位置
    alert('File location cannot be opened in browser. Please check your downloads folder.');
  };

  const closeDependencyCheck = () => {
    setDependencyCheckShown(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#f5f5f7'
    }}>
      <TitleBar />
      
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
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
            <Routes>
              <Route 
                path="/" 
                element={
                  <DownloadList 
                    downloads={downloads} 
                    onDelete={handleDeleteDownload}
                    onOpenLocation={handleOpenFileLocation}
                  />
                } 
              />
            </Routes>
          </div>
          
          {isSettingsOpen && (
            <div style={{
              position: 'fixed',
              top: '38px', // Height of TitleBar
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

      {isNewTaskModalOpen && (
        <NewTaskModal 
          onClose={() => setIsNewTaskModalOpen(false)}
          onSubmit={handleStartDownload}
        />
      )}

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