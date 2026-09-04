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
  // Estimated fill, not a server measurement — see downloadPdf(). Kept apart
  // from `downloadingPdf` so the bar can finish AFTER the file is in hand.
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfElapsed, setPdfElapsed] = useState(0);

  // PDF export is offered only for HTML pitches that are NOT content-protected
  // or watermarked — those signal "sensitive", so no downloadable copy.
  const pdfAllowed =
    pitch.fileType === 'html' && !token.protectContent && !token.watermark;

  /**
   * Export takes real time: a cold 24-slide deck measured 37s on production
   * (the server drives a browser through every slide), against 0.6s once the
   * result is cached. Without feedback that reads as a hung button.
   *
   * The fill is an ESTIMATE from elapsed time, not progress reported by the
   * server — there is no progress channel on a single request. It eases and
   * stops short of full on its own, so it can never claim to be finished
   * before the file actually is; only a delivered blob fills it to 100%.
   */
  async function downloadPdf() {
    setDownloadingPdf(true);
    setPdfProgress(0);
    setPdfElapsed(0);
    const startedAt = Date.now();
    const ticker = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setPdfElapsed(Math.floor(seconds));
      // Asymptotic: fast at first, then visibly slowing — never past 92.
      setPdfProgress(92 * (1 - Math.exp(-seconds / 12)));
    }, 100);
    let ok = false;
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
      ok = true;
    } catch {
      // best-effort; the button re-enables so the viewer can retry
    } finally {
      clearInterval(ticker);
      if (ok) {
        // Let the bar visibly complete before the button returns to rest.
        setPdfProgress(100);
        setTimeout(() => {
          setDownloadingPdf(false);
          setPdfProgress(0);
          setPdfElapsed(0);
        }, 450);
      } else {
        setDownloadingPdf(false);
        setPdfProgress(0);
        setPdfElapsed(0);
      }
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
        {/* The button doubles as the progress gauge while it works, so the wait
            is legible without adding a second element over the pitch. */}
        {pdfAllowed && (
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf}
            data-testid="viewer-download-pdf"
            aria-label="Download som PDF"
            role={downloadingPdf ? 'progressbar' : undefined}
            aria-valuemin={downloadingPdf ? 0 : undefined}
            aria-valuemax={downloadingPdf ? 100 : undefined}
            aria-valuenow={downloadingPdf ? Math.round(pdfProgress) : undefined}
            aria-valuetext={downloadingPdf ? `Genererer PDF, ${pdfElapsed} sekunder` : undefined}
            className="fixed bottom-4 right-4 z-50 inline-flex min-w-[11.5rem] items-center justify-center gap-2 overflow-hidden rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-black/85 active:scale-95 disabled:opacity-100"
          >
            {/* Fill sweeps left → right underneath the label. Green reads as
                "working, going well"; emerald-600 at 75% over the black pill
                keeps the white label at ~4.6:1, so the text stays readable at
                every fill level rather than only at the ends. */}
            {downloadingPdf && (
              <span
                aria-hidden="true"
                data-testid="viewer-pdf-progress"
                className="absolute inset-y-0 left-0 bg-emerald-600/75 transition-[width] duration-200 ease-out"
                style={{ width: `${pdfProgress}%` }}
              />
            )}
            <DownloadIcon
              className={downloadingPdf ? 'relative h-4 w-4 animate-pulse' : 'h-4 w-4'}
            />
            <span className="relative tabular-nums">
              {downloadingPdf ? `Genererer PDF… ${pdfElapsed}s` : 'Download PDF'}
            </span>
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
