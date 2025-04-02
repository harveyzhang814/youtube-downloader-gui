import React from 'react';
import DownloadItem from './DownloadItem';

const DownloadList = ({ downloads, onDelete, onOpenLocation }) => {
  if (downloads.length === 0) {
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
      {downloads.map(download => (
        <DownloadItem 
          key={download.id}
          download={download}
          onDelete={() => onDelete(download.id)}
          onOpenLocation={() => onOpenLocation(`${download.path}/${download.title}`)}
        />
      ))}
    </div>
  );
};

export default DownloadList; 