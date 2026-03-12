'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SparklesIcon, SendIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Template, Folder } from '@/lib/db/schema';

type Phase = 'setup' | 'generating' | 'chat' | 'refining';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

interface SlideInfo {
  slide: number;
  title: string | null;
}

function injectSlideDetection(html: string): string {
  const script = `<script>
(function() {
  var cur = 0;
  function notify(s, t) {
    try { window.parent.postMessage({ type: 'slideChange', slide: s, title: t || null }, '*'); } catch(e) {}
  }
  function init() {
    var els = document.querySelectorAll('section, [class*="slide"], [class*="page"], [class*="panel"]');
    if (els.length > 1) {
      var obs = new IntersectionObserver(function(entries) {
        var best = null, bestR = 0;
        entries.forEach(function(e) { if (e.intersectionRatio > bestR) { bestR = e.intersectionRatio; best = e; } });
        if (best && bestR > 0.25) {
          var idx = Array.prototype.indexOf.call(els, best.target) + 1;
          if (idx !== cur) { cur = idx; var h = best.target.querySelector('h1,h2,h3'); notify(idx, h ? h.textContent.trim() : null); }
        }
      }, { threshold: [0.25, 0.5, 0.75] });
      els.forEach(function(el) { obs.observe(el); });
      cur = 1;
      var fh = els[0] && els[0].querySelector('h1,h2,h3');
      notify(1, fh ? fh.textContent.trim() : null);
    } else {
      var vh = window.innerHeight || 800;
      function onScroll() { var s = Math.floor(window.scrollY / vh) + 1; if (s !== cur) { cur = s; notify(s, null); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      cur = 1; notify(1, null);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>`;
  if (html.match(/<\/body>/i)) return html.replace(/<\/body>/i, script + '</body>');
  return html + script;
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateForm />
    </Suspense>
  );
}

function GenerateForm() {
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>('setup');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Form
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [templateId, setTemplateId] = useState('none');
  const [folderId, setFolderId] = useState('none');

  // Chat
  const [pitchId, setPitchId] = useState<string | null>(null);
  const [html, setHtml] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [slideInfo, setSlideInfo] = useState<SlideInfo>({ slide: 1, title: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/templates').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/folders').then((r) => (r.ok ? r.json() : [])),
    ]).then(([tmpl, fold]) => {
      setTemplates(tmpl);
      setFolders(fold);
      const pre = searchParams.get('templateId');
      if (pre) setTemplateId(pre);
    });

    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'slideChange') {
        setSlideInfo({ slide: e.data.slide, title: e.data.title });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleGenerate() {
    if (!title.trim() || !prompt.trim()) {
      toast.error('Title and prompt are required');
      return;
    }
    setPhase('generating');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          templateId: templateId === 'none' ? undefined : templateId,
          folderId: folderId === 'none' ? undefined : folderId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Generation failed');
      }
      const { pitchId: id, html: generatedHtml } = await res.json();
      setPitchId(id);
      setHtml(injectSlideDetection(generatedHtml));
      setMessages([
        {
          role: 'ai',
          content: 'Præsentationen er klar! Scroll igennem den og beskriv hvad du vil ændre.',
        },
      ]);
      setPhase('chat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
      setPhase('setup');
    }
  }

  async function handleSend() {
    const msg = chatInput.trim();
    if (!msg || !pitchId || phase === 'refining') return;

    // Collect previous user messages as history before adding the new one
    const history = messages.filter((m) => m.role === 'user').map((m) => m.content);

    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setPhase('refining');

    const slideCtx =
      slideInfo.title
        ? `Slide ${slideInfo.slide} ("${slideInfo.title}")`
        : slideInfo.slide > 1
        ? `Slide ${slideInfo.slide}`
        : null;

    try {
      const res = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitchId, userMessage: msg, currentSlide: slideCtx, history }),
      });
      if (!res.ok) throw new Error('Refinement failed');
      const { html: newHtml } = await res.json();
      setHtml(injectSlideDetection(newHtml));
      setMessages((prev) => [...prev, { role: 'ai', content: '✓ Opdateret' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: '⚠ Noget gik galt. Prøv igen.' },
      ]);
    }
    setPhase('chat');
    setTimeout(() => chatInputRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── SETUP / GENERATING ──────────────────────────────────────────────────────
  if (phase === 'setup' || phase === 'generating') {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <h1 className="text-base font-semibold">Generer Pitch med AI</h1>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Pitch-titel</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="f.eks. Series A Fundraising Deck"
                    disabled={phase === 'generating'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Skabelon (valgfri)</Label>
                  <Select
                    value={templateId}
                    onValueChange={setTemplateId}
                    disabled={phase === 'generating'}
                  >
                    <SelectTrigger id="template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen skabelon — AI vælger stil</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Hvad skal pitchen handle om?</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    placeholder="f.eks. En SaaS-platform til at dele pitch decks. Vi har 500 betalende kunder og vokser 20% MoM. Vi søger at rejse 2M for at udvide salgsteamet..."
                    disabled={phase === 'generating'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folder">Mappe (valgfri)</Label>
                  <Select
                    value={folderId}
                    onValueChange={setFolderId}
                    disabled={phase === 'generating'}
                  >
                    <SelectTrigger id="folder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen mappe</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={phase === 'generating' || !title.trim() || !prompt.trim()}
                  className="w-full"
                >
                  {phase === 'generating' ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Genererer…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="mr-2 h-4 w-4" />
                      Generer Pitch
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              Drevet af Claude Haiku · Generering tager 5–15 sek. · Du kan raffinere med chat bagefter
            </p>
          </div>
        </main>
      </>
    );
  }

  // ── CHAT MODE ───────────────────────────────────────────────────────────────
  const isRefining = phase === 'refining';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 z-10">
        <SidebarTrigger />
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        {slideInfo.slide > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
            Slide {slideInfo.slide}
            {slideInfo.title ? ` — ${slideInfo.title}` : ''}
          </span>
        )}
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/pitches/${pitchId}`}>Gem &amp; vis →</Link>
        </Button>
      </header>

      {/* Content row */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Preview iframe */}
        <div className="flex-1 bg-muted/20 overflow-hidden">
          <iframe
            key={html.length} // re-mount when content changes to reset scroll
            srcDoc={html}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Pitch Preview"
          />
        </div>

        {/* Chat sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-background">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isRefining && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Slide indicator pill */}
          {slideInfo.slide > 0 && (
            <div className="border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              📍 Slide {slideInfo.slide}
              {slideInfo.title ? `: ${slideInfo.title}` : ''}
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t p-3 space-y-1.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Beskriv en ændring…"
                rows={2}
                disabled={isRefining}
                className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-h-[44px] max-h-[120px]"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isRefining || !chatInput.trim()}
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                <SendIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Enter sender · Shift+Enter ny linje · AI kender din slide-position
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
