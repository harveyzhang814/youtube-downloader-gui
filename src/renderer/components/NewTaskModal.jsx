import React, { useState } from 'react';

// Fix the electron import
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const NewTaskModal = ({ onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [selectedVideoFormat, setSelectedVideoFormat] = useState(null);
  const [selectedAudioFormat, setSelectedAudioFormat] = useState(null);
  const [videoFormats, setVideoFormats] = useState([]);
  const [audioFormats, setAudioFormats] = useState([]);
  const [subtitles, setSubtitles] = useState([]);
  const [subtitleSearch, setSubtitleSearch] = useState('');
  const [isSubtitleDropdownOpen, setIsSubtitleDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [saveSubsAsFile, setSaveSubsAsFile] = useState(true);

  // List of available subtitle languages
  const availableSubtitles = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-Hans', name: 'Chinese (Simplified)' },
    { code: 'zh-Hant', name: 'Chinese (Traditional)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'el', name: 'Greek' },
    { code: 'he', name: 'Hebrew' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'uk', name: 'Ukrainian' }
  ];

  const filteredSubtitles = availableSubtitles.filter(lang => 
    (lang.code.toLowerCase().includes(subtitleSearch.toLowerCase()) ||
     lang.name.toLowerCase().includes(subtitleSearch.toLowerCase())) &&
    !subtitles.includes(lang.code)
  );

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setError(null);
    setVideoFormats([]);
    setAudioFormats([]);
    setSelectedVideoFormat(null);
    setSelectedAudioFormat(null);
  };

  const searchFormats = async () => {
    if (!url.trim()) return;
    if (!ipcRenderer) {
      setError('Electron IPC not available');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setVideoFormats([]);
    setAudioFormats([]);
    setSelectedVideoFormat(null);
    setSelectedAudioFormat(null);
    
    try {
      // Validate URL format first
      if (!url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/) &&
          !url.match(/^https?:\/\/youtu\.be\/[\w-]+/)) {
        throw new Error('Please enter a valid YouTube URL');
      }

      const { videoFormats, audioFormats } = await ipcRenderer.invoke('task:getAvailableFormats', url);
      setVideoFormats(videoFormats);
      setAudioFormats(audioFormats);
      
      // Default selections
      if (videoFormats.length > 0) {
        setSelectedVideoFormat(videoFormats[0].id);
      }
      if (audioFormats.length > 0) {
        setSelectedAudioFormat(audioFormats[0].id);
      }
    } catch (error) {
      console.error('Error fetching formats:', error);
      setError(error.message || 'Failed to fetch video formats. Please check the URL and your internet connection.');
      setVideoFormats([]);
      setAudioFormats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVideoFormat && !selectedAudioFormat) {
      setError('Please select at least one format (video or audio)');
      return;
    }

    // 查找完整格式对象
    const videoObj = videoFormats.find(f => f.id === selectedVideoFormat);
    const audioObj = audioFormats.find(f => f.id === selectedAudioFormat);

    // 组装 settings 字段
    const settings = {
      url,
      video: videoObj
        ? {
            id: videoObj.id,
            resolution: videoObj.resolution,
            format: videoObj.ext
          }
        : null,
      audio: audioObj
        ? {
            id: audioObj.id,
            sampleRate: audioObj.asr || '',
            format: audioObj.ext
          }
        : null,
      subtitles: {
        languages: subtitles,
        separateFile: saveSubsAsFile
      }
    };

    onSubmit(settings);
    // onClose 由 App 控制
  };

  const handleSubtitleToggle = (langCode) => {
    setSubtitles(prev => 
      prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
    setSubtitleSearch('');
  };

  const handleRemoveSubtitle = (langCode) => {
    setSubtitles(prev => prev.filter(l => l !== langCode));
  };

  const handleSubtitleInputFocus = (e) => {
    const inputContainer = e.target.closest('div[style*="border"]');
    if (inputContainer) {
      const rect = inputContainer.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
      setIsSubtitleDropdownOpen(true);
    }
  };

  const handleSubtitleInputBlur = (e) => {
    setTimeout(() => {
      setIsSubtitleDropdownOpen(false);
    }, 200);
  };

  const VideoFormatList = ({ formats, selectedFormat, onFormatSelect }) => (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '13px',
        color: '#666'
      }}>
        Video Formats
      </label>
      <div style={{
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '6px',
        maxHeight: '150px',
        overflowY: 'auto'
      }}>
        {formats.map((format) => (
          <label
            key={format.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px',
              cursor: 'pointer',
              backgroundColor: selectedFormat === format.id ? '#f0f9ff' : 'transparent',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontSize: '13px',
              ':hover': {
                backgroundColor: selectedFormat === format.id ? '#f0f9ff' : '#f5f5f7'
              }
            }}
          >
            <input
              type="radio"
              name="video-format"
              value={format.id}
              checked={selectedFormat === format.id}
              onChange={() => onFormatSelect(format.id)}
              style={{ marginRight: '12px', marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1
                }}>
                  <span style={{ 
                    fontWeight: '500',
                    minWidth: '80px'
                  }}>
                    {format.resolution}
                  </span>
                  <span style={{ 
                    fontSize: '12px',
                    color: '#666',
                    backgroundColor: '#f0f0f0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {format.ext}
                  </span>
                  {format.fps && (
                    <span style={{ 
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {format.fps} FPS
                    </span>
                  )}
                  {format.vbr && (
                    <span style={{ 
                      fontSize: '12px',
                      color: '#666',
                      marginLeft: format.fps ? '8px' : '0'
                    }}>
                      {format.vbr}
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '12px',
                    color: '#666',
                    marginLeft: 'auto'
                  }}>
                    {format.filesize}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '11px',
                  color: '#666',
                  opacity: 0.7
                }}>
                  ID: {format.id}
                </span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                lineHeight: '1.4'
              }}>
                {/* {format.description} */}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const AudioFormatList = ({ formats, selectedFormat, onFormatSelect }) => (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '13px',
        color: '#666'
      }}>
        Audio Formats
      </label>
      <div style={{
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '6px',
        maxHeight: '150px',
        overflowY: 'auto'
      }}>
        {formats.map((format) => (
          <label
            key={format.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px',
              cursor: 'pointer',
              backgroundColor: selectedFormat === format.id ? '#f0f9ff' : 'transparent',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontSize: '13px',
              ':hover': {
                backgroundColor: selectedFormat === format.id ? '#f0f9ff' : '#f5f5f7'
              }
            }}
          >
            <input
              type="radio"
              name="audio-format"
              value={format.id}
              checked={selectedFormat === format.id}
              onChange={() => onFormatSelect(format.id)}
              style={{ marginRight: '12px', marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1
                }}>
                  <span style={{ 
                    fontWeight: '500',
                    minWidth: '80px'
                  }}>
                    {format.audioLang || 'Default'}
                  </span>
                  <span style={{ 
                    fontSize: '12px',
                    color: '#666',
                    backgroundColor: '#f0f0f0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {format.ext}
                  </span>
                  {format.abr && (
                    <span style={{
                      fontSize: '12px',
                      color: '#888',
                      marginLeft: '8px',
                      fontStyle: 'italic'
                    }}>
                      {format.abr}
                    </span>
                  )}
                  {format.asr && (
                    <span style={{ 
                      fontSize: '12px',
                      color: '#666',
                      marginLeft: format.asr ? '8px' : '0'
                    }}>
                      {format.asr}
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '12px',
                    color: '#666',
                    marginLeft: 'auto'
                  }}>
                    {format.filesize}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '11px',
                  color: '#666',
                  opacity: 0.7
                }}>
                  ID: {format.id}
                </span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                lineHeight: '1.4'
              }}>
                {/* {format.description} */}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

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
        maxHeight: '90vh',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
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
              color: '#666'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ 
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              YouTube URL
            </label>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}
              />
              <button
                type="button"
                onClick={searchFormats}
                disabled={isLoading || !url.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: 'white',
                  backgroundColor: '#0066cc',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: url.trim() ? 'pointer' : 'not-allowed',
                  opacity: url.trim() ? 1 : 0.5
                }}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ marginTop: '2px', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12" y2="16" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Error</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {(videoFormats.length > 0 || audioFormats.length > 0) && (
            <>
              {videoFormats.length > 0 && (
                <VideoFormatList
                  formats={videoFormats}
                  selectedFormat={selectedVideoFormat}
                  onFormatSelect={setSelectedVideoFormat}
                />
              )}
              
              {audioFormats.length > 0 && (
                <AudioFormatList
                  formats={audioFormats}
                  selectedFormat={selectedAudioFormat}
                  onFormatSelect={setSelectedAudioFormat}
                />
              )}
            </>
          )}

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              Subtitles (Optional)
            </label>
            <div style={{
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              backgroundColor: 'white',
              minHeight: '38px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              padding: '4px 8px'
            }}>
              {subtitles.map(langCode => {
                const lang = availableSubtitles.find(l => l.code === langCode);
                return (
                  <div key={langCode} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <span>{lang ? lang.name : langCode}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtitle(langCode)}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: '#666'
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <input
                type="text"
                value={subtitleSearch}
                onChange={(e) => setSubtitleSearch(e.target.value)}
                onFocus={handleSubtitleInputFocus}
                onBlur={handleSubtitleInputBlur}
                placeholder={subtitles.length > 0 ? "Add more..." : "Search languages..."}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '4px',
                  flex: 1,
                  minWidth: '100px',
                  fontSize: '13px'
                }}
              />
            </div>
            {subtitles.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#666',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={saveSubsAsFile}
                    onChange={(e) => setSaveSubsAsFile(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  Save subtitles as separate files
                </label>
              </div>
            )}
          </div>

          {isSubtitleDropdownOpen && filteredSubtitles.length > 0 && (
            <div style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: 'white',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000
            }}>
              {filteredSubtitles.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => handleSubtitleToggle(lang.code)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    ':hover': {
                      backgroundColor: '#f5f5f7'
                    }
                  }}
                >
                  {lang.name} ({lang.code})
                </div>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0,0,0,0.1)'
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
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedVideoFormat && !selectedAudioFormat || isLoading}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#0066cc',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedVideoFormat || selectedAudioFormat ? 'pointer' : 'not-allowed',
                opacity: selectedVideoFormat || selectedAudioFormat ? 1 : 0.5
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