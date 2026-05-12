'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  PresentationIcon,
  LayoutDashboardIcon,
  FolderIcon,
  UsersIcon,
  SettingsIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import type { Pitch } from '@/lib/db/schema';

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && pitches.length === 0) {
      fetch('/api/pitches')
        .then((r) => r.json())
        .then(setPitches)
        .catch(() => {});
    }
  }, [open, pitches.length]);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Søg pitches, navigation…" />
      <CommandList>
        <CommandEmpty>Ingen resultater.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => router.push('/dashboard'))}>
            <LayoutDashboardIcon className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/pitches'))}>
            <PresentationIcon className="mr-2 h-4 w-4" />
            Pitches
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/folders'))}>
            <FolderIcon className="mr-2 h-4 w-4" />
            Folders
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/users'))}>
            <UsersIcon className="mr-2 h-4 w-4" />
            Users
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/settings'))}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        {pitches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pitches">
              {pitches.map((pitch) => (
                <CommandItem
                  key={pitch.id}
                  value={`${pitch.title} ${pitch.description ?? ''}`}
                  onSelect={() => run(() => window.open(`/preview/${pitch.id}`, '_blank'))}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <PresentationIcon className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="truncate">{pitch.title}</span>
                  </span>
                  <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 opacity-40" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
