import React from 'react';

const DependencyCheck = ({ dependencies, onClose }) => {
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
      <div className="mt-4 text-sm">
        <h3 className="font-medium mb-2">Installation Instructions:</h3>
        <div className="space-y-2">
          {!ytdlp && (
            <div>
              <p className="font-medium">yt-dlp:</p>
              <ul className="list-disc pl-5 text-xs">
                <li>
                  <strong>macOS (Homebrew):</strong> <code className="bg-gray-100 px-1 rounded">brew install yt-dlp</code>
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
              <p className="font-medium">ffmpeg:</p>
              <ul className="list-disc pl-5 text-xs">
                <li>
                  <strong>macOS (Homebrew):</strong> <code className="bg-gray-100 px-1 rounded">brew install ffmpeg</code>
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
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center">
          <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h2 className="text-lg font-medium">Missing Dependencies</h2>
        </div>
        
        <div className="p-4">
          <p className="mb-2">
            This application requires the following dependencies that are not currently installed:
          </p>
          
          <ul className="list-disc pl-5 mb-4">
            {missingDeps.map(dep => (
              <li key={dep} className="font-medium">{dep}</li>
            ))}
          </ul>
          
          <p>
            Please install the missing dependencies to use all features of this application.
          </p>
          
          {getInstallationInstructions()}
        </div>
        
        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            className="mac-button-primary"
            onClick={onClose}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyCheck; 