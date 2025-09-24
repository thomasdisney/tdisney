'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { deleteDrawing, loadDrawing, renameDrawing, type Drawing } from '@/lib/drawings';
import { useDrawing } from '@/components/DrawingContext';
import { useToast } from '@/components/ToastProvider';

type SessionsDropdownProps = {
  sessions: Drawing[];
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
};

export function SessionsDropdown({ sessions, onRefresh, isLoading = false }: SessionsDropdownProps) {
  const {
    currentDrawingId,
    currentDrawingTitle,
    setScene,
    setCurrentDrawingId,
    setCurrentDrawingTitle,
    setBackgroundFromUrl,
    setBackgroundPath,
    setBackgroundFile
  } = useDrawing();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [sessions]);

  const beginRename = useCallback((session: Drawing) => {
    setRenamingId(session.id);
    setRenameValue(session.title);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleRenameCommit = useCallback(async () => {
    if (!renamingId) {
      return;
    }
    const newTitle = renameValue.trim();
    if (!newTitle) {
      showToast('Please enter a new session name.', 'error');
      return;
    }
    setWorkingId(renamingId);
    try {
      await renameDrawing(renamingId, newTitle);
      if (currentDrawingId === renamingId) {
        setCurrentDrawingTitle(newTitle);
      }
      showToast('Session renamed.', 'success');
      await onRefresh();
      cancelRename();
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Unable to rename session.', 'error');
      }
    } finally {
      setWorkingId(null);
    }
  }, [cancelRename, currentDrawingId, onRefresh, renamingId, renameValue, setCurrentDrawingTitle, showToast]);

  const handleDelete = useCallback(
    async (session: Drawing) => {
      const confirmed = window.confirm(`Delete “${session.title}”? This cannot be undone.`);
      if (!confirmed) {
        return;
      }
      setWorkingId(session.id);
      try {
        await deleteDrawing(session.id);
        if (currentDrawingId === session.id) {
          setCurrentDrawingId(null);
          setCurrentDrawingTitle(null);
          setScene([]);
          setBackgroundFromUrl(null);
          setBackgroundPath(null);
          setBackgroundFile(null);
        }
        showToast('Session deleted.', 'success');
        await onRefresh();
      } catch (error) {
        if (error instanceof Error) {
          showToast(error.message, 'error');
        } else {
          showToast('Unable to delete session.', 'error');
        }
      } finally {
        setWorkingId(null);
      }
    },
    [currentDrawingId, onRefresh, setBackgroundFile, setBackgroundFromUrl, setBackgroundPath, setCurrentDrawingId, setCurrentDrawingTitle, setScene, showToast]
  );

  const handleLoad = useCallback(
    async (session: Drawing) => {
      setWorkingId(session.id);
      try {
        const payload = await loadDrawing(session.id);
        setScene(payload.elements);
        setBackgroundFromUrl(payload.bgUrl);
        setBackgroundPath(payload.bgPath);
        setCurrentDrawingId(session.id);
        setCurrentDrawingTitle(session.title);
        showToast(`Loaded “${session.title}”.`, 'success');
      } catch (error) {
        if (error instanceof Error) {
          showToast(error.message, 'error');
        } else {
          showToast('Unable to load session.', 'error');
        }
      } finally {
        setWorkingId(null);
        setOpen(false);
      }
    },
    [setBackgroundFromUrl, setBackgroundPath, setCurrentDrawingId, setCurrentDrawingTitle, setScene, showToast]
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isLoading}
        style={{
          backgroundColor: '#1f2937',
          color: '#f8fafc',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.3)',
          padding: '10px 18px',
          minWidth: 140,
          fontWeight: 600
        }}
      >
        Sessions ▾
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            backgroundColor: '#0f172a',
            borderRadius: 12,
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.55)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            zIndex: 30
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            Current: {currentDrawingTitle ? `“${currentDrawingTitle}”` : 'None loaded'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedSessions.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>No sessions yet.</span>
            ) : (
              sortedSessions.map((session) => {
                const isRenaming = renamingId === session.id;
                const isCurrent = currentDrawingId === session.id;
                const busy = workingId === session.id;
                return (
                  <div
                    key={session.id}
                    style={{
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 10,
                      padding: 12,
                      backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    {isRenaming ? (
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleRenameCommit();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelRename();
                          }
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(148, 163, 184, 0.4)',
                          background: '#020617',
                          color: '#f8fafc'
                        }}
                        autoFocus
                      />
                    ) : (
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{session.title}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isRenaming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRenameCommit();
                            }}
                            disabled={busy}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#2563eb',
                              color: '#fff',
                              fontWeight: 600
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              background: 'transparent',
                              color: '#e2e8f0'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleLoad(session);
                            }}
                            disabled={busy}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              fontWeight: 600
                            }}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => beginRename(session)}
                            disabled={busy}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(148, 163, 184, 0.4)',
                              background: 'transparent',
                              color: '#e2e8f0'
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(session);
                            }}
                            disabled={busy}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(248, 113, 113, 0.5)',
                              background: 'transparent',
                              color: '#f87171'
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <span>{sortedSessions.length >= 3 ? 'Limit reached (3 sessions).' : ''}</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void onRefresh();
              }}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background: 'transparent',
                color: '#e2e8f0'
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
