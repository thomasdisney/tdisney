'use client';

import { useCallback, useEffect, useState } from 'react';
import { DrawingProvider, useDrawing } from '@/components/DrawingContext';
import { BackgroundUploader } from '@/components/BackgroundUploader';
import { CanvasStage } from '@/components/CanvasStage';
import { SaveSessionButton } from '@/components/SaveSessionButton';
import { SessionsDropdown } from '@/components/SessionsDropdown';
import { useToast } from '@/components/ToastProvider';
import { listDrawings, type Drawing } from '@/lib/drawings';

function PageInner() {
  const [sessions, setSessions] = useState<Drawing[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const { showToast } = useToast();
  const { currentDrawingTitle } = useDrawing();

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await listDrawings();
      setSessions(data);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Unable to load sessions.', 'error');
      }
    } finally {
      setLoadingSessions(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  return (
    <main
      style={{
        padding: '48px clamp(24px, 5vw, 60px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        maxWidth: 1100,
        margin: '0 auto'
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>SlipBot Studio</h1>
        <p style={{ margin: 0, color: '#94a3b8', maxWidth: 720 }}>
          Drag warehouse assets into the scene, upload a background floor plan, and save up to three sessions per account. Sessions
          store your entire layout, including the background image.
        </p>
      </header>
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center'
        }}
      >
        <SaveSessionButton sessionCount={sessions.length} onSessionsChanged={refreshSessions} />
        <SessionsDropdown sessions={sessions} onRefresh={refreshSessions} isLoading={loadingSessions} />
        <BackgroundUploader />
        <div style={{ color: '#94a3b8', fontSize: 14 }}>
          {currentDrawingTitle ? `Working on “${currentDrawingTitle}”` : 'Unsaved session'}
        </div>
      </section>
      <CanvasStage />
    </main>
  );
}

export default function Page() {
  return (
    <DrawingProvider>
      <PageInner />
    </DrawingProvider>
  );
}
