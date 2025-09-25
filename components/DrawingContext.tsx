'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSignedUrl, type SceneElement } from '@/lib/drawings';

type PersistedDrawingState = {
  currentDrawingId: string | null;
  currentDrawingTitle: string | null;
  elements: SceneElement[];
  backgroundPath: string | null;
  backgroundUrl: string | null;
};

const LOCAL_STORAGE_KEY = 'slipbot-studio-state-v1';

function isPersistedDrawingState(value: unknown): value is PersistedDrawingState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedDrawingState>;

  if (
    'currentDrawingId' in candidate &&
    candidate.currentDrawingId !== null &&
    typeof candidate.currentDrawingId !== 'string'
  ) {
    return false;
  }

  if (
    'currentDrawingTitle' in candidate &&
    candidate.currentDrawingTitle !== null &&
    typeof candidate.currentDrawingTitle !== 'string'
  ) {
    return false;
  }

  if (
    'backgroundPath' in candidate &&
    candidate.backgroundPath !== null &&
    typeof candidate.backgroundPath !== 'string'
  ) {
    return false;
  }

  if (
    'backgroundUrl' in candidate &&
    candidate.backgroundUrl !== null &&
    typeof candidate.backgroundUrl !== 'string'
  ) {
    return false;
  }

  if ('elements' in candidate && !Array.isArray(candidate.elements)) {
    return false;
  }

  return true;
}

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
  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    const restoreState = async () => {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw);
        if (!isPersistedDrawingState(parsed)) {
          throw new Error('Persisted state does not match expected shape.');
        }

        setCurrentDrawingId(parsed.currentDrawingId ?? null);
        setCurrentDrawingTitle(parsed.currentDrawingTitle ?? null);
        setElements(Array.isArray(parsed.elements) ? parsed.elements : []);
        setBackgroundPathState(parsed.backgroundPath ?? null);

        if (parsed.backgroundPath) {
          try {
            const signedUrl = await getSignedUrl(parsed.backgroundPath);
            if (isMounted) {
              setBackgroundUrl(signedUrl);
            }
          } catch (error) {
            console.error('Failed to restore background image', error);
          }
        } else if (isMounted) {
          setBackgroundUrl(parsed.backgroundUrl ?? null);
        }
      } catch (error) {
        console.error('Failed to restore drawing session state', error);
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void restoreState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }

    const persistedState: PersistedDrawingState = {
      currentDrawingId,
      currentDrawingTitle,
      elements,
      backgroundPath,
      backgroundUrl: backgroundPath || backgroundFile ? null : backgroundUrl
    };

    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.error('Failed to persist drawing session state', error);
    }
  }, [
    backgroundFile,
    backgroundPath,
    backgroundUrl,
    currentDrawingId,
    currentDrawingTitle,
    elements,
    isHydrated
  ]);

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return ctx;
}
