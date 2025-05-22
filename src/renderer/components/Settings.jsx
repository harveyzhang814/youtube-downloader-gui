import React, { useState, useEffect } from 'react';

// Fix the electron import
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    downloadLocation: '',
    browserCookie: 'chrome'
  });

  useEffect(() => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    
    // Load settings from main process
    ipcRenderer.invoke('settings:getDownloadLocation').then(res => {
      setSettings(prev => ({ ...prev, downloadLocation: res.data }));
    });
    ipcRenderer.invoke('settings:getCookieSource').then(res => {
      setSettings(prev => ({ ...prev, browserCookie: res.data }));
    });
  }, []);

  const handleDownloadPathSelect = async () => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      return;
    }
    const res = await ipcRenderer.invoke('dialog:chooseDirectory');
    if (res && res.data) {
      setSettings(prev => ({ ...prev, downloadLocation: res.data }));
    }
  };

  const handleBrowserCookieChange = (e) => {
    const newSource = e.target.value;
    setSettings(prev => ({ ...prev, browserCookie: newSource }));
    if (ipcRenderer) {
      ipcRenderer.invoke('settings:setCookieSource', newSource);
    }
  };

  const handleSave = async () => {
    if (!ipcRenderer) {
      console.error('Electron IPC not available');
      onClose();
      return;
    }
    // 保存下载目录
    await ipcRenderer.invoke('settings:setDownloadLocation', settings.downloadLocation);
    // 保存 Cookie Source
    await ipcRenderer.invoke('settings:setCookieSource', settings.browserCookie);
    onClose();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        backgroundColor: '#f5f5f7'
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#333'
        }}>Settings</h2>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: 'rgba(0,0,0,0.05)'
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
          }}>Download Settings</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Default Download Location
            </label>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}
                value={settings.downloadLocation}
                readOnly
              />
              <button 
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#666',
                  backgroundColor: '#f5f5f7',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  ':hover': {
                    backgroundColor: '#e5e5e7'
                  }
                }}
                onClick={handleDownloadPathSelect}
              >
                Browse
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Cookie Source
            </label>
            <select 
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
              value={settings.browserCookie}
              onChange={handleBrowserCookieChange}
            >
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge</option>
              <option value="opera">Opera</option>
              <option value="brave">Brave</option>
              <option value="none">None</option>
            </select>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#666'
            }}>
              Select browser to extract cookies from (helps bypass restrictions)
            </p>
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        backgroundColor: '#f5f5f7'
      }}>
        <button 
          style={{
            width: '100%',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'white',
            backgroundColor: '#0066cc',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#0055aa'
            }
          }}
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings; 