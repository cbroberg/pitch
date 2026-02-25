'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SaveIcon, ArrowLeftIcon, FileIcon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css',
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    svg: 'xml', xml: 'xml',
    txt: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

export default function EditPitchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pitchTitle, setPitchTitle] = useState('');

  const isDirty = content !== savedContent;

  useEffect(() => {
    fetch(`/api/pitches/${id}`)
      .then((r) => r.json())
      .then((p) => setPitchTitle(p.title ?? ''));

    fetch(`/api/pitches/${id}/files`)
      .then((r) => r.json())
      .then(({ files: f }: { files: string[] }) => {
        setFiles(f);
        if (f.length > 0) selectFile(f[0]);
      });
  }, [id]);

  const selectFile = useCallback(async (filename: string) => {
    if (isDirty && selectedFile) {
      const ok = window.confirm('Du har ugemte ændringer. Fortsæt uden at gemme?');
      if (!ok) return;
    }
    setLoading(true);
    setSelectedFile(filename);
    const res = await fetch(`/api/pitches/${id}/files/${filename}`);
    if (res.ok) {
      const { content: c } = await res.json();
      setContent(c);
      setSavedContent(c);
    }
    setLoading(false);
  }, [id, isDirty, selectedFile]);

  async function handleSave() {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pitches/${id}/files/${selectedFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setSavedContent(content);
        toast.success(`Saved ${selectedFile}`);
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, selectedFile]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/pitches/${id}`)}>
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{pitchTitle}</span>
        {selectedFile && (
          <>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-mono text-muted-foreground">{selectedFile}</span>
          </>
        )}
        {isDirty && (
          <Badge variant="outline" className="text-xs ml-1">unsaved</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => selectedFile && selectFile(selectedFile)}
            disabled={loading}
          >
            <RefreshCwIcon className="mr-1 h-3.5 w-3.5" />
            Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            <SaveIcon className="mr-1 h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <aside className="w-52 shrink-0 border-r bg-muted/20 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Files
          </div>
          <ul className="space-y-0.5 px-2 pb-4">
            {files.map((f) => (
              <li key={f}>
                <button
                  onClick={() => selectFile(f)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left transition-colors',
                    selectedFile === f
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-mono text-xs">{f}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-hidden">
          {!selectedFile ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Select a file to edit
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language={getLanguage(selectedFile)}
              value={content}
              onChange={(v) => setContent(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
                fontLigatures: true,
                minimap: { enabled: true },
                wordWrap: 'on',
                tabSize: 2,
                scrollBeyondLastLine: false,
                formatOnPaste: true,
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                suggest: { showKeywords: true },
                quickSuggestions: { other: true, comments: false, strings: true },
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
