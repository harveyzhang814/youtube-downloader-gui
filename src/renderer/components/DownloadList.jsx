import React, { useEffect, useState } from 'react';
import DownloadItem from './DownloadItem';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const DownloadList = (props) => {
  const [tasks, setTasks] = useState([]);

  // 定时刷新任务列表
  useEffect(() => {
    if (!ipcRenderer) return;
    const fetchTasks = async () => {
      const list = await ipcRenderer.invoke('task:scan');
      console.log('任务列表', list); // 调试用
      setTasks(list);
    };
    fetchTasks();
    const timer = setInterval(fetchTasks, 2000);
    // 监听主进程推送的进度
    const handler = (event, data) => {
      setTasks(prevTasks => prevTasks.map(
        t => t.id === data.taskId ? { ...t, ...data } : t
      ));
    };
    ipcRenderer.on('task:progress', handler);
    return () => {
      clearInterval(timer);
      ipcRenderer.removeListener('task:progress', handler);
    };
  }, []);

  // 删除任务
  const handleDelete = async (taskId) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('task:delete', taskId);
    // 删除后立即刷新
    const list = await ipcRenderer.invoke('task:scan');
    setTasks(list);
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        color: '#666',
        textAlign: 'center',
        padding: '32px'
      }}>
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
          style={{ marginBottom: '16px', opacity: 0.5 }}
        >
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <p style={{ 
          fontSize: '18px', 
          fontWeight: '500', 
          marginBottom: '8px',
          color: '#333'
        }}>No downloads yet</p>
        <p style={{ 
          fontSize: '14px',
          color: '#666'
        }}>Click "New Download" to get started</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      width: '100%', 
      maxWidth: '800px',
      margin: '0 auto',
      padding: '16px'
    }}>
      {tasks.map(task => (
        <DownloadItem 
          key={task.id}
          task={task}
          onDelete={() => handleDelete(task.id)}
          onOpenLocation={(outputDir) => props.onOpenLocation && props.onOpenLocation(outputDir)}
        />
      ))}
    </div>
  );
};

export default DownloadList; 