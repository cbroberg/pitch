'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SendIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pitch } from '@/lib/db/schema';

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

export default function PitchAIPage() {
  const { id } = useParams<{ id: string }>();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [slideInfo, setSlideInfo] = useState<SlideInfo>({ slide: 1, title: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const [pitchRes, fileRes] = await Promise.all([
        fetch(`/api/pitches/${id}`),
        fetch(`/api/pitches/${id}/files/index.html`),
      ]);

      if (!pitchRes.ok) { setLoadError('Pitch ikke fundet'); return; }
      const p: Pitch = await pitchRes.json();
      setPitch(p);

      if (!fileRes.ok) {
        setLoadError('Denne pitch har ingen HTML-fil. Upload en index.html for at bruge AI-editoren.');
        return;
      }
      const { content } = await fileRes.json();
      setHtml(injectSlideDetection(content));
      setMessages([{ role: 'ai', content: 'Klar! Scroll igennem præsentationen og beskriv hvad du vil ændre.' }]);
    }
    load();

    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'slideChange') {
        setSlideInfo({ slide: e.data.slide, title: e.data.title });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const msg = chatInput.trim();
    if (!msg || refining) return;

    // Collect previous user messages as history before adding the new one
    const history = messages.filter((m) => m.role === 'user').map((m) => m.content);

    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setRefining(true);

    const slideCtx = slideInfo.title
      ? `Slide ${slideInfo.slide} ("${slideInfo.title}")`
      : slideInfo.slide > 1
      ? `Slide ${slideInfo.slide}`
      : null;

    try {
      const res = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitchId: id, userMessage: msg, currentSlide: slideCtx, history }),
      });
      if (!res.ok) throw new Error('Fejl fra server');
      const { html: newHtml } = await res.json();
      setHtml(injectSlideDetection(newHtml));
      setMessages((prev) => [...prev, { role: 'ai', content: '✓ Opdateret' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: '⚠ Noget gik galt. Prøv igen.' }]);
    }
    setRefining(false);
    setTimeout(() => chatInputRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Loading
  if (!pitch && !loadError) {
    return (
      <>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Skeleton className="h-5 w-40" />
        </header>
        <main className="flex-1 p-6">
          <Skeleton className="h-64 w-full" />
        </main>
      </>
    );
  }

  // Error
  if (loadError) {
    return (
      <>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-base font-semibold">{pitch?.title ?? 'AI Editor'}</span>
        </header>
        <main className="flex-1 p-6">
          <p className="text-muted-foreground">{loadError}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/pitches/${id}`}>← Tilbage</Link>
          </Button>
        </main>
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 z-10">
        <SidebarTrigger />
        <h1 className="flex-1 truncate text-base font-semibold">{pitch!.title}</h1>
        {slideInfo.slide > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
            Slide {slideInfo.slide}
            {slideInfo.title ? ` — ${slideInfo.title}` : ''}
          </span>
        )}
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/pitches/${id}`}>← Pitch</Link>
        </Button>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Preview */}
        <div className="flex-1 bg-muted/20 overflow-hidden">
          {html && (
            <iframe
              key={html.length}
              srcDoc={html}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Pitch Preview"
            />
          )}
        </div>

        {/* Chat */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-background">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
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

            {refining && (
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

          {slideInfo.slide > 0 && (
            <div className="border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              📍 Slide {slideInfo.slide}
              {slideInfo.title ? `: ${slideInfo.title}` : ''}
            </div>
          )}

          <div className="shrink-0 border-t p-3 space-y-1.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Beskriv en ændring…"
                rows={2}
                disabled={refining}
                className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-h-[44px] max-h-[120px]"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={refining || !chatInput.trim()}
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
