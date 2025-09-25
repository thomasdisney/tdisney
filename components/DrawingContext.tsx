'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneElement } from '@/lib/drawings';

type DrawingContextValue = {
  currentDrawingId: string | null;
  currentDrawingTitle: string | null;
  elements: SceneElement[];
  backgroundUrl: string | null;
  backgroundPath: string | null;
  backgroundFile: File | null;
  setCurrentDrawingId: (id: string | null) => void;
  setCurrentDrawingTitle: (title: string | null) => void;
  setScene: (next: SceneElement[]) => void;
  getScene: () => SceneElement[];
  setBackgroundFromUrl: (url: string | null) => void;
  setBackgroundPath: (path: string | null) => void;
  setBackgroundFile: (file: File | null) => void;
  commitBackground: (path: string | null, url?: string | null) => void;
};

const DrawingContext = createContext<DrawingContextValue | undefined>(undefined);

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [currentDrawingTitle, setCurrentDrawingTitle] = useState<string | null>(null);
  const [elements, setElements] = useState<SceneElement[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundPath, setBackgroundPathState] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFileState] = useState<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const value = useMemo<DrawingContextValue>(() => {
    const revokeObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    return {
      currentDrawingId,
      currentDrawingTitle,
      elements,
      backgroundUrl,
      backgroundPath,
      backgroundFile,
      setCurrentDrawingId,
      setCurrentDrawingTitle,
      setScene: (next) => {
        setElements(next);
      },
      getScene: () => elements,
      setBackgroundFromUrl: (url) => {
        revokeObjectUrl();
        setBackgroundUrl(url);
        setBackgroundFileState(null);
      },
        setBackgroundPath: (path) => {
          setBackgroundPathState(path);
        },
      setBackgroundFile: (file) => {
        revokeObjectUrl();
        setBackgroundFileState(file);
        if (file) {
          const objectUrl = URL.createObjectURL(file);
          objectUrlRef.current = objectUrl;
          setBackgroundUrl(objectUrl);
          setBackgroundPathState(null);
        } else {
          setBackgroundUrl(null);
          setBackgroundPathState(null);
        }
      },
      commitBackground: (path, url) => {
        if (typeof url !== 'undefined') {
          revokeObjectUrl();
          setBackgroundUrl(url);
        }
        setBackgroundPathState(path);
        setBackgroundFileState(null);
      }
    };
  }, [backgroundFile, backgroundPath, backgroundUrl, currentDrawingId, currentDrawingTitle, elements]);

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return ctx;
}
