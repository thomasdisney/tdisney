'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { useDrawing } from '@/components/DrawingContext';

export function CanvasStage() {
  const { elements, setScene, backgroundUrl } = useDrawing();

  const addRectangle = useCallback(() => {
    setScene([
      ...elements,
      {
        id: crypto.randomUUID(),
        type: 'rect' as const,
        x: Math.floor(Math.random() * 400),
        y: Math.floor(Math.random() * 220),
        w: 80,
        h: 60,
        style: { fill: '#38bdf8' }
      }
    ]);
  }, [elements, setScene]);

  const clearScene = useCallback(() => {
    setScene([]);
  }, [setScene]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={addRectangle}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.4)',
            background: 'transparent',
            color: '#e2e8f0'
          }}
        >
          Add rectangle
        </button>
        <button
          type="button"
          onClick={clearScene}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(248, 113, 113, 0.4)',
            background: 'transparent',
            color: '#f87171'
          }}
        >
          Clear scene
        </button>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 400,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#111827',
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {elements.map((element) => {
          if (element.type === 'rect') {
            return (
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: element.x,
                  top: element.y,
                  width: element.w ?? 80,
                  height: element.h ?? 60,
                  borderRadius: 8,
                  backgroundColor: (element.style?.fill as string) ?? 'rgba(59, 130, 246, 0.7)',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.4)'
                }}
              />
            );
          }
          if (element.type === 'text') {
            return (
              <span
                key={element.id}
                style={{
                  position: 'absolute',
                  left: element.x,
                  top: element.y,
                  color: '#f8fafc',
                  fontWeight: 600
                }}
              >
                {element.text ?? 'Label'}
              </span>
            );
          }
          if (element.type === 'image' && element.src) {
            const width = element.w ?? 80;
            const height = element.h ?? 80;
            return (
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: element.x,
                  top: element.y,
                  width,
                  height
                }}
              >
                <Image
                  src={element.src}
                  alt="Scene asset"
                  fill
                  unoptimized
                  style={{ objectFit: 'contain' }}
                  sizes={`${width}px`}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
