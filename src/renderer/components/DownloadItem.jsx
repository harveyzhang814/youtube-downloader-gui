import React from 'react';

const DownloadItem = ({ download, onDelete, onOpenLocation }) => {
  const { title, url, progress, speed, size, status } = download;
  
  const getCleanTitle = (fullTitle) => {
    // Split by path separators and get the last part
    const parts = fullTitle.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    
    // Replace Chinese punctuation with English punctuation
    return filename
      .replace(/：/g, ': ')
      .replace(/？/g, '?')
      .replace(/！/g, '!')
      .replace(/，/g, ', ')
      .replace(/。/g, '.')
      .replace(/；/g, '; ')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/【/g, '[')
      .replace(/】/g, ']')
      .replace(/《/g, '"')
      .replace(/》/g, '"')
      .replace(/「/g, "'")
      .replace(/」/g, "'")
      .replace(/…/g, '...')
      .replace(/—/g, '-')
      .replace(/～/g, '~')
      .replace(/·/g, '.')
      .replace(/、/g, ', ');
  };
  
  const getStatusLabel = () => {
    switch (status) {
      case 'downloading':
        return (
          <span style={{ color: '#0066cc', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" className="animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span style={{ marginLeft: '4px', fontSize: '13px' }}>Downloading</span>
          </span>
        );
      case 'completed':
        return (
          <span style={{ color: '#34c759', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span style={{ marginLeft: '4px', fontSize: '13px' }}>Complete</span>
          </span>
        );
      case 'error':
        return (
          <span style={{ color: '#ff3b30', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ marginLeft: '4px', fontSize: '13px' }}>Error</span>
          </span>
        );
      default:
        return <span style={{ fontSize: '13px' }}>Unknown</span>;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '12px',
      width: '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px'
      }}>
        <div style={{ 
          flexGrow: 1, 
          marginRight: '12px',
          marginTop: '2px'
        }}>
          <h3 style={{ 
            fontWeight: '500', 
            color: '#333', 
            marginBottom: '2px',
            wordBreak: 'break-word',
            lineHeight: '1.3',
            fontSize: '14px',
            margin: 0
          }}>{getCleanTitle(title)}</h3>
          <p style={{
            fontSize: '12px',
            color: '#666',
            wordBreak: 'break-word',
            lineHeight: '1.3',
            margin: 0,
            marginTop: '2px'
          }}>{url}</p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '6px',
          marginTop: '2px'
        }}>
          {status === 'completed' && (
            <button 
              onClick={onOpenLocation}
              style={{
                padding: '2px',
                color: '#666',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                height: '20px'
              }}
              title="Open File Location"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          <button 
            onClick={onDelete}
            style={{
              padding: '2px',
              color: '#666',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              height: '20px'
            }}
            title="Delete"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '2px',
          fontSize: '12px',
          color: '#666' 
        }}>
          <div>
            {getStatusLabel()}
          </div>
          <div>
            {progress.toFixed(1)}% {status !== 'completed' && speed ? `• ${speed}` : ''} {size ? `• ${size}` : ''}
          </div>
        </div>
        <div style={{ 
          width: '100%', 
          backgroundColor: '#e5e5e5', 
          borderRadius: '9999px', 
          height: '6px', 
          overflow: 'hidden' 
        }}>
          <div 
            style={{ 
              height: '100%', 
              borderRadius: '9999px',
              backgroundColor: status === 'completed' ? '#34c759' : status === 'error' ? '#ff3b30' : '#0066cc',
              width: `${Math.min(progress, 100)}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DownloadItem; 