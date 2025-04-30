import React, { useState, useEffect } from 'react';

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    downloadPath: '',
    browserCookie: 'chrome'
  });

  useEffect(() => {
    // 加载设置
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(error => {
      console.error('Error loading settings:', error);
      });
  }, []);

  const handleDownloadPathSelect = async () => {
    try {
      const response = await fetch('/api/select-directory');
      if (!response.ok) {
        throw new Error('Failed to select directory');
      }
      const { path } = await response.json();
    if (path) {
      setSettings(prev => ({ ...prev, downloadPath: path }));
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('Failed to select download directory');
    }
  };

  const handleBrowserCookieChange = (e) => {
    setSettings(prev => ({ ...prev, browserCookie: e.target.value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
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
                value={settings.downloadPath}
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

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Browser Cookie Source
            </label>
            <select 
              value={settings.browserCookie}
              onChange={handleBrowserCookieChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px'
      }}>
        <button 
          onClick={onClose}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: '#666',
            backgroundColor: '#f5f5f7',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: 'white',
            backgroundColor: '#0066cc',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default Settings; 