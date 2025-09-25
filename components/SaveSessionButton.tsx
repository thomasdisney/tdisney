'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { createDrawing, updateDrawing } from '@/lib/drawings';
import { useDrawing } from '@/components/DrawingContext';
import { useToast } from '@/components/ToastProvider';

type SaveSessionButtonProps = {
  sessionCount: number;
  onSessionsChanged: () => Promise<void>;
};

async function cloneFileFromUrl(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to download background image for saving.');
  }
  const blob = await response.blob();
  const extension = blob.type.split('/')[1] ?? 'png';
  return new File([blob], `background.${extension}`, { type: blob.type || 'image/png' });
}

export function SaveSessionButton({ sessionCount, onSessionsChanged }: SaveSessionButtonProps) {
  const {
    currentDrawingId,
    currentDrawingTitle,
    getScene,
    backgroundFile,
    backgroundUrl,
    backgroundPath,
    setCurrentDrawingId,
    setCurrentDrawingTitle,
    commitBackground
  } = useDrawing();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasCurrentDrawing = useMemo(() => Boolean(currentDrawingId), [currentDrawingId]);
  const willOverwriteOldest = useMemo(() => sessionCount >= 3, [sessionCount]);

  const ensureBackgroundFileForCreate = useCallback(async () => {
    if (backgroundFile) {
      return backgroundFile;
    }
    if (backgroundUrl) {
      return cloneFileFromUrl(backgroundUrl);
    }
    return undefined;
  }, [backgroundFile, backgroundUrl]);

  const handleCreate = useCallback(
    async (title: string) => {
      if (!title.trim()) {
        showToast('Please enter a session name.', 'error');
        return;
      }
      setIsSaving(true);
      try {
        const bgFileForCreate = await ensureBackgroundFileForCreate();
        const { drawing, replacedDrawing } = await createDrawing(title.trim(), getScene(), bgFileForCreate);
        setCurrentDrawingId(drawing.id);
        setCurrentDrawingTitle(drawing.title);
        commitBackground(drawing.bg_image_path ?? null);
        if (replacedDrawing) {
          showToast(`Session saved. Overwrote “${replacedDrawing.title}”.`, 'success');
        } else {
          showToast('Session saved.', 'success');
        }
        await onSessionsChanged();
      } catch (error) {
        if (error instanceof Error) {
          showToast(error.message, 'error');
        } else {
          showToast('Unable to save session.', 'error');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      commitBackground,
      ensureBackgroundFileForCreate,
      getScene,
      onSessionsChanged,
      setCurrentDrawingId,
      setCurrentDrawingTitle,
      showToast
    ]
  );

  const handleOverwrite = useCallback(async () => {
    if (!currentDrawingId) {
      return;
    }
    setIsSaving(true);
    try {
      await updateDrawing(currentDrawingId, getScene(), backgroundFile ?? undefined);
      commitBackground(backgroundPath ?? null);
      showToast('Session updated.', 'success');
      await onSessionsChanged();
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Unable to update session.', 'error');
      }
    } finally {
      setIsSaving(false);
      setMenuOpen(false);
    }
  }, [backgroundFile, backgroundPath, commitBackground, currentDrawingId, getScene, onSessionsChanged, showToast]);

  const promptForTitle = useCallback(
    (initial?: string | null) => {
      const title = window.prompt('Name this session', initial ?? '');
      if (!title) {
        return null;
      }
      return title.trim();
    },
    []
  );

  const handlePrimaryClick = useCallback(() => {
    if (isSaving) {
      return;
    }
    if (!hasCurrentDrawing) {
      const title = promptForTitle();
      if (title) {
        void handleCreate(title);
      }
    } else {
      setMenuOpen((open) => !open);
    }
  }, [handleCreate, hasCurrentDrawing, isSaving, promptForTitle]);

  const handleSaveAs = useCallback(() => {
    const title = promptForTitle(currentDrawingTitle);
    if (title) {
      setMenuOpen(false);
      void handleCreate(title);
    }
  }, [currentDrawingTitle, handleCreate, promptForTitle]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handlePrimaryClick}
        disabled={isSaving}
        title={willOverwriteOldest ? 'Saving will overwrite your oldest session.' : undefined}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontWeight: 600,
          minWidth: 120
        }}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
      {hasCurrentDrawing && menuOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            backgroundColor: '#1e293b',
            borderRadius: 8,
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 180,
            zIndex: 20
          }}
        >
          <button
            type="button"
            onClick={() => {
              void handleOverwrite();
            }}
            disabled={isSaving}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 6
            }}
          >
            Overwrite “{currentDrawingTitle ?? 'Untitled'}”
          </button>
          <button
            type="button"
            onClick={handleSaveAs}
            disabled={isSaving}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 6
            }}
            title={willOverwriteOldest ? 'Will overwrite your oldest session.' : undefined}
          >
            Save As…
          </button>
        </div>
      ) : null}
    </div>
  );
}
