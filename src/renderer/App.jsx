import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Toolbar from './components/Toolbar';
import DownloadList from './components/DownloadList';
import NewTaskModal from './components/NewTaskModal';
import Settings from './components/Settings';
import DependencyCheck from './components/DependencyCheck';

// Fix the electron import
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const App = () => {
  const [downloads, setDownloads] = useState([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dependencies, setDependencies] = useState({ ytdlp: true, ffmpeg: true });
  const [dependencyCheckShown, setDependencyCheckShown] = useState(false);

  useEffect(() => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }

    // Listen for dependency check results
    ipcRenderer.on('dependencies-check', (_, deps) => {
      setDependencies(deps);
      if (!deps.ytdlp || !deps.ffmpeg) {
        setDependencyCheckShown(true);
      }
    });

    // Listen for download updates
    ipcRenderer.on('download-started', (_, downloadInfo) => {
      setDownloads(prev => [...prev, downloadInfo]);
    });

    ipcRenderer.on('download-progress', (_, downloadInfo) => {
      setDownloads(prev => 
        prev.map(download => 
          download.id === downloadInfo.id ? downloadInfo : download
        )
      );
    });

    ipcRenderer.on('download-finished', (_, downloadInfo) => {
      setDownloads(prev => 
        prev.map(download => 
          download.id === downloadInfo.id ? downloadInfo : download
        )
      );
    });

    // Cleanup listeners on unmount
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('dependencies-check');
        ipcRenderer.removeAllListeners('download-started');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('download-finished');
      }
    };
  }, []);

  const handleStartDownload = async (downloadData) => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    
    try {
      await ipcRenderer.invoke('download-video', downloadData);
      setIsNewTaskModalOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteDownload = (downloadId) => {
    setDownloads(prev => prev.filter(download => download.id !== downloadId));
  };

  const handleOpenFileLocation = async (filePath) => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    
    await ipcRenderer.invoke('open-file-location', filePath);
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