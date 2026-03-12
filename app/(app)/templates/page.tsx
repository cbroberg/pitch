'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ImageIcon, LayoutTemplateIcon, SparklesIcon, TrashIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Template } from '@/lib/db/schema';
import { TemplateThumbnail } from '@/components/template-thumbnail';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/templates/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      toast.success('Template deleted');
    } else {
      toast.error('Failed to delete template');
    }
    setDeleteId(null);
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Templates</h1>
        <div className="ml-auto flex items-center gap-2">
          {templates.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetch('/api/templates/thumbnails-batch', { method: 'POST' });
                toast.success('Generating thumbnails…');
                setTimeout(load, 8000);
              }}
            >
              <ImageIcon className="mr-1 h-3.5 w-3.5" />
              Thumbnails
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/templates/generate">
              <SparklesIcon className="mr-1 h-3.5 w-3.5" />
              Generate Pitch
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <LayoutTemplateIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">No templates yet</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Save a pitch as a template to reuse its design. Open a pitch and click &ldquo;Save as Template&rdquo;.
            </p>
            <Button asChild>
              <Link href="/templates/generate">
                <SparklesIcon className="mr-1 h-4 w-4" />
                Generate Pitch Without Template
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="group relative overflow-hidden">
                <TemplateThumbnail templateId={t.id} className="w-full aspect-video" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold leading-tight">{t.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(t.createdAt * 1000), { addSuffix: true })}
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/templates/generate?templateId=${t.id}`}>
                      <SparklesIcon className="mr-1 h-3.5 w-3.5" />
                      Use This Template
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template and its files. Pitches created from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
