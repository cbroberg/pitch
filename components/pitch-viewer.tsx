'use client';

import { useEffect, useRef, useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import type { Pitch, AccessToken } from '@/lib/db/schema';

interface PitchViewerProps {
  pitch: Pitch;
  token: AccessToken;
  contentUrl: string;
}

export function PitchViewer({ pitch, token, contentUrl }: PitchViewerProps) {
  const startTimeRef = useRef(Date.now());
  const sentRef = useRef(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // PDF export is offered only for HTML pitches that are NOT content-protected
  // or watermarked — those signal "sensitive", so no downloadable copy.
  const pdfAllowed =
    pitch.fileType === 'html' && !token.protectContent && !token.watermark;

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/view/${token.token}/pdf`);
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pitch.slug || 'pitch'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // best-effort; the button re-enables so the viewer can retry
    } finally {
      setDownloadingPdf(false);
    }
  }

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
      <div className="relative h-screen w-full">
        <iframe
          src={contentUrl}
          className="h-screen w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={pitch.title}
        />
        {pdfAllowed && (
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf}
            data-testid="viewer-download-pdf"
            aria-label="Download som PDF"
            className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-black/85 active:scale-95 disabled:opacity-60"
          >
            <DownloadIcon
              className={downloadingPdf ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'}
            />
            {downloadingPdf ? 'Genererer PDF…' : 'Download PDF'}
          </button>
        )}
      </div>
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
          data-testid="viewer-download-file"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Download File
        </a>
      </div>
    </div>
  );
}
