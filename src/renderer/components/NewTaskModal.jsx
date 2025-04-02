import React, { useState } from 'react';

// Fix the electron import
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const NewTaskModal = ({ onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('bestvideo+bestaudio/best');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('none');
  const [audioQuality, setAudioQuality] = useState('best');
  const [subtitles, setSubtitles] = useState([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setVideoInfo(null);
    setError(null);
  };

  const fetchVideoInfo = async () => {
    if (!url.trim()) return;
    if (!ipcRenderer) {
      setError('Electron IPC not available');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await ipcRenderer.invoke('get-video-info', url);
      setVideoInfo(info);
    } catch (error) {
      setError('Failed to fetch video information. Please check the URL and your internet connection.');
      console.error('Error fetching video info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      url, 
      format, 
      quality,
      audioFormat,
      audioQuality,
      subtitles: subtitles.length > 0 ? subtitles.join(',') : null
    });
  };

  const handleSubtitleToggle = (lang) => {
    setSubtitles(prev => 
      prev.includes(lang) 
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
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
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
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
          }}>New Download Task</h2>
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

        <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              YouTube URL
            </label>
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Video Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="bestvideo+bestaudio/best">Best Video + Best Audio</option>
              <option value="bestvideo+bestaudio">Best Video + Best Audio (Separate)</option>
              <option value="best">Best Quality</option>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mkv">MKV</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Video Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="best">Best Available</option>
              <option value="2160p">4K (2160p)</option>
              <option value="1440p">2K (1440p)</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Audio Format
            </label>
            <select
              value={audioFormat}
              onChange={(e) => setAudioFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="none">No Audio</option>
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="aac">AAC</option>
              <option value="wav">WAV</option>
            </select>
          </div>

          {audioFormat !== 'none' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#666'
              }}>
                Audio Quality
              </label>
              <select
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}
              >
                <option value="best">Best Available</option>
                <option value="320k">320 kbps</option>
                <option value="256k">256 kbps</option>
                <option value="192k">192 kbps</option>
                <option value="128k">128 kbps</option>
                <option value="96k">96 kbps</option>
                <option value="64k">64 kbps</option>
                <option value="48k">48 kbps</option>
                <option value="32k">32 kbps</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Subtitles
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              maxHeight: '120px',
              overflow: 'auto',
              padding: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}>
              {['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'].map(lang => (
                <label key={lang} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: subtitles.includes(lang) ? '#f0f0f0' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    checked={subtitles.includes(lang)}
                    onChange={() => handleSubtitleToggle(lang)}
                    style={{ margin: 0 }}
                  />
                  <span>{lang.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
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
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
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
            >
              Start Download
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal; 