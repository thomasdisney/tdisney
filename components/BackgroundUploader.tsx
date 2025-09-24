'use client';

import React, { ChangeEvent } from 'react';
import { useDrawing } from '@/components/DrawingContext';

export function BackgroundUploader() {
  const { backgroundUrl, setBackgroundFile } = useDrawing();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBackgroundFile(file);
    }
  };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px dashed rgba(148, 163, 184, 0.4)',
        color: '#e2e8f0',
        cursor: 'pointer'
      }}
    >
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      {backgroundUrl ? 'Replace background image' : 'Upload background image'}
    </label>
  );
}
