'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeftIcon, SaveIcon, RotateCcwIcon, Loader2Icon, MousePointerClickIcon, CheckIcon } from 'lucide-react';
import { injectWysiwyg } from '@/lib/wysiwyg-inject';
import type { Pitch } from '@/lib/db/schema';

export default function VisualEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [originalHtml, setOriginalHtml] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingSaveRef = useRef(false);
  // Keep a ref to pitch so the message handler always sees the latest value
  const pitchRef = useRef<Pitch | null>(null);
  // Ref so the message handler always has the latest originalHtml (not a stale closure)
  const originalHtmlRef = useRef<string>('');

  // Load pitch metadata + HTML
  useEffect(() => {
    async function load() {
      const pitchRes = await fetch(`/api/pitches/${id}`);
      if (!pitchRes.ok) { router.push('/pitches'); return; }
      const p: Pitch = await pitchRes.json();
      setPitch(p);
      pitchRef.current = p;

      const entryFile = p.entryFile ?? 'index.html';
      const fileRes = await fetch(`/api/pitches/${id}/files/${entryFile}`);
      if (!fileRes.ok) { toast.error('Could not load pitch HTML'); return; }
      const { content: html } = await fileRes.json();
      setOriginalHtml(html);
      originalHtmlRef.current = html;
      setSrcDoc(injectWysiwyg(html));
    }
    load();
  }, [id, router]);

  const saveHtml = useCallback(async (html: string) => {
    const p = pitchRef.current;
    if (!p) return;
    setSaving(true);
    try {
      const entryFile = p.entryFile ?? 'index.html';
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], entryFile, { type: 'text/html' });
      const form = new FormData();
      form.append('files', file);
      const res = await fetch(`/api/pitches/${id}/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setDirty(false);
      setOriginalHtml(html);
      originalHtmlRef.current = html;
      setSrcDoc(injectWysiwyg(html));
      setReady(false);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [id]);

  // Listen to messages from the iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data) return;

      if (e.data.type === 'wysiwygReady') {
        setReady(true);
        // Send original HTML to iframe so it can apply edits cleanly
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'setOriginal', html: originalHtmlRef.current },
            '*'
          );
        }
      }

      if (e.data.type === 'editingActive') {
        setDirty(true);
      }

      if (e.data.type === 'htmlContent' && pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void saveHtml(e.data.html as string);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [saveHtml]);

  const handleSave = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    pendingSaveRef.current = true;
    iframeRef.current.contentWindow.postMessage({ type: 'getHtml' }, '*');
  }, []);

  const handleReset = useCallback(() => {
    setSrcDoc(injectWysiwyg(originalHtml));
    setReady(false);
    setDirty(false);
    setSaved(false);
  }, [originalHtml]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <header className="flex h-12 items-center gap-2 border-b bg-background px-3 shrink-0 z-10">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/pitches/${id}`}>
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back
          </Link>
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <span className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">
          {pitch?.title ?? '…'}
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {!ready && srcDoc && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </span>
          )}
          {ready && !dirty && !saved && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MousePointerClickIcon className="h-3.5 w-3.5" />
              Click any text to edit
            </span>
          )}
          {dirty && !saved && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcwIcon className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !ready}
            className={`gap-1.5 transition-colors ${saved ? 'bg-green-600 hover:bg-green-600 text-white' : ''}`}
          >
            {saving
              ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              : saved
                ? <CheckIcon className="h-3.5 w-3.5" />
                : <SaveIcon className="h-3.5 w-3.5" />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </header>

      {/* iframe */}
      <div className="flex-1 overflow-hidden bg-neutral-900">
        {srcDoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-modals"
            className="w-full h-full border-0"
            title="Visual editor"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Loading pitch…
          </div>
        )}
      </div>
    </div>
  );
}
