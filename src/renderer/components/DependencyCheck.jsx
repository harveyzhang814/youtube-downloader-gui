import React from 'react';

const DependencyCheck = ({ dependencies, error, onClose }) => {
  const { ytdlp, ffmpeg } = dependencies;
  
  const getMissingDependencies = () => {
    const missing = [];
    if (!ytdlp) missing.push('yt-dlp');
    if (!ffmpeg) missing.push('ffmpeg');
    return missing;
  };
  
  const missingDeps = getMissingDependencies();
  
  const getInstallationInstructions = () => {
    return (
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ 
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px'
        }}>
          Installation Instructions:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!ytdlp && (
            <div>
              <p style={{ 
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '4px'
              }}>
                yt-dlp:
              </p>
              <ul style={{ 
                listStyle: 'disc',
                paddingLeft: '20px',
                fontSize: '12px'
              }}>
                <li>
                  <strong>macOS (Homebrew):</strong>{' '}
                  <code style={{ 
                    backgroundColor: '#f0f0f0',
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}>
                    brew install yt-dlp
                  </code>
                </li>
                <li>
                  <strong>Windows:</strong> <a href="https://github.com/yt-dlp/yt-dlp#installation" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download from GitHub</a>
                </li>
                <li>
                  <strong>Linux:</strong> <code className="bg-gray-100 px-1 rounded">sudo apt install yt-dlp</code> or <code className="bg-gray-100 px-1 rounded">sudo pip install yt-dlp</code>
                </li>
              </ul>
            </div>
          )}
          
          {!ffmpeg && (
            <div>
              <p style={{ 
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '4px'
              }}>
                ffmpeg:
              </p>
              <ul style={{ 
                listStyle: 'disc',
                paddingLeft: '20px',
                fontSize: '12px'
              }}>
                <li>
                  <strong>macOS (Homebrew):</strong>{' '}
                  <code style={{ 
                    backgroundColor: '#f0f0f0',
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}>
                    brew install ffmpeg
                  </code>
                </li>
                <li>
                  <strong>Windows:</strong> <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download from ffmpeg.org</a>
                </li>
                <li>
                  <strong>Linux:</strong> <code className="bg-gray-100 px-1 rounded">sudo apt install ffmpeg</code>
                </li>
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <p style={{ 
              color: '#dc2626',
              fontWeight: '500',
              marginBottom: '4px'
            }}>
              Error checking dependencies:
            </p>
            <p style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#333'
          }}>Missing Dependencies</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          <p style={{
            fontSize: '14px',
            color: '#333',
            marginBottom: '8px'
          }}>
            The following dependencies are required but not found:
          </p>
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {missingDeps.map(dep => (
              <li 
                key={dep}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {dep}
              </li>
            ))}
          </ul>

          {getInstallationInstructions()}
        </div>

        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
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
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyCheck; 