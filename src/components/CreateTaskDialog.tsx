import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch } from '@mui/material';

const CreateTaskDialog: React.FC = () => {
  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>('');
  const [saveSubsAsFile, setSaveSubsAsFile] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          format: selectedFormat,
          subtitleLanguage,
          saveSubsAsFile,
        }),
      });
      // ... existing code ...
    } catch (error) {
      // ... existing code ...
    }
  };

  return (
    <div>
      {/* ... existing code ... */}
      <FormControl fullWidth>
        <InputLabel>字幕语言</InputLabel>
        <Select
          value={subtitleLanguage}
          onChange={(e) => setSubtitleLanguage(e.target.value)}
          label="字幕语言"
        >
          <MenuItem value="">无</MenuItem>
          <MenuItem value="zh">中文</MenuItem>
          <MenuItem value="en">英文</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel
        control={
          <Switch
            checked={saveSubsAsFile}
            onChange={(e) => setSaveSubsAsFile(e.target.checked)}
            disabled={!subtitleLanguage}
          />
        }
        label="保存字幕为单独文件"
        sx={{ mt: 1 }}
      />
      {/* ... existing code ... */}
    </div>
  );
};

export default CreateTaskDialog; 