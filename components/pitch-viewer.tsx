'use client';

import { useEffect, useRef, useState } from 'react';
import type { Pitch, AccessToken } from '@/lib/db/schema';

interface PitchViewerProps {
  pitch: Pitch;
  token: AccessToken;
  contentUrl: string;
}

export function PitchViewer({ pitch, token, contentUrl }: PitchViewerProps) {
  const startTimeRef = useRef(Date.now());
  const sentRef = useRef(false);

  function sendViewEvent(duration: number) {
    if (sentRef.current) return;
    sentRef.current = true;
    const payload = JSON.stringify({
      pitchId: pitch.id,
      tokenId: token.id,
      email: token.email,
      duration: Math.round(duration / 1000),
    });
    // Use sendBeacon for reliability on page close
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/view-event', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/view-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  useEffect(() => {
    // Record view on mount
    const payload = JSON.stringify({
      pitchId: pitch.id,
      tokenId: token.id,
      email: token.email,
    });
    fetch('/api/view-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {});

    function handleUnload() {
      const duration = Date.now() - startTimeRef.current;
      sendViewEvent(duration);
    }

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  if (pitch.fileType === 'html') {
    return (
      <iframe
        src={contentUrl}
        className="w-full h-screen border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title={pitch.title}
      />
    );
  }

  if (pitch.fileType === 'pdf') {
    return (
      <iframe
        src={contentUrl}
        className="w-full h-screen border-0"
        title={pitch.title}
      />
    );
  }

  if (pitch.fileType === 'image') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentUrl}
          alt={pitch.title}
          className="max-w-full max-h-screen object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-lg font-medium">{pitch.title}</p>
        <a
          href={contentUrl}
          download
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Download File
        </a>
      </div>
    </div>
  );
}
