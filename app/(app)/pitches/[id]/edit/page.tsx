'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SaveIcon, ArrowLeftIcon, EyeIcon } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const DEFAULT_FONT_SIZE = 16;

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
  const searchParams = useSearchParams();

  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pitchTitle, setPitchTitle] = useState('');
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const isDirty = content !== savedContent;

  // Load font size from user settings
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (s?.editorFontSize) setFontSize(s.editorFontSize); })
      .catch(() => {});
  }, []);

  // Load pitch + files
  useEffect(() => {
    fetch(`/api/pitches/${id}`)
      .then((r) => r.json())
      .then((p) => setPitchTitle(p.title ?? ''));

    fetch(`/api/pitches/${id}/files`)
      .then((r) => r.json())
      .then(({ files: f }: { files: string[] }) => {
        setFiles(f);
        const initial = searchParams.get('file') ?? f[0] ?? null;
        if (initial) loadFile(initial);
      });
  }, [id]);

  const loadFile = useCallback(async (filename: string) => {
    setLoading(true);
    setSelectedFile(filename);
    const res = await fetch(`/api/pitches/${id}/files/${filename}`);
    if (res.ok) {
      const { content: c } = await res.json();
      setContent(c);
      setSavedContent(c);
    }
    setLoading(false);
  }, [id]);

  async function handleFileChange(filename: string) {
    if (isDirty) {
      const ok = window.confirm('Du har ugemte ændringer. Fortsæt uden at gemme?');
      if (!ok) return;
    }
    loadFile(filename);
  }

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
        toast.success('Saved');
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, selectedFile, savedContent]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/pitches/${id}`)}>
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground truncate hidden sm:block">{pitchTitle}</span>

        {/* File selector */}
        {files.length > 0 && (
          <Select value={selectedFile ?? ''} onValueChange={handleFileChange}>
            <SelectTrigger className="w-56 h-8 font-mono text-xs">
              <SelectValue placeholder="Select file…" />
            </SelectTrigger>
            <SelectContent>
              {files.map((f) => (
                <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isDirty && (
          <Badge variant="outline" className="text-xs shrink-0">unsaved</Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer">
              <EyeIcon className="mr-1 h-3.5 w-3.5" />
              Preview
            </a>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty || !selectedFile}>
            <SaveIcon className="mr-1 h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        {!selectedFile || loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            {loading ? 'Loading…' : 'Select a file to edit'}
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={getLanguage(selectedFile)}
            value={content}
            onChange={(v) => setContent(v ?? '')}
            theme="vs-dark"
            options={{
              fontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              tabSize: 2,
              scrollBeyondLastLine: false,
              formatOnPaste: true,
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              quickSuggestions: { other: true, comments: false, strings: true },
              padding: { top: 16 },
            }}
          />
        )}
      </main>
    </div>
  );
}
