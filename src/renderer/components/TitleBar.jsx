import React from 'react';

const TitleBar = () => {
  return (
    <div className="titlebar" style={{ 
      backgroundColor: '#f5f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      height: '38px',
      borderBottom: '1px solid rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        position: 'absolute',
        left: '12px',
        top: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div className="titlebar-button" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff605c' }}></div>
        <div className="titlebar-button" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd44' }}></div>
        <div className="titlebar-button" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00ca4e' }}></div>
      </div>
      <h1 style={{ 
        margin: 0,
        fontSize: '14px',
        fontWeight: '500',
        color: '#333'
      }}>YouTube Downloader</h1>
    </div>
  );
};

export default TitleBar; 