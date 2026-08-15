'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Mirrors the server's normalization (lib/db/queries/tags.ts) so what the
 *  owner sees in the chip is exactly what gets stored. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 30);
}

function idSafe(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Existing tag names, offered as you type so one subject isn't spelled two ways. */
  suggestions?: string[];
  placeholder?: string;
  /** Base for the data-testid anchors (Lens). */
  testId: string;
  className?: string;
}

/**
 * Tag entry: each tag becomes a removable chip on Enter/comma, with a
 * suggestion list drawn from tags already in use. Styled to match
 * EmailTagInput so the two read as one system. (F022.2)
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  testId,
  className,
}: TagInputProps) {
  const [draft, setDraft] = React.useState('');
  const [open, setOpen] = React.useState(false);
  // -1 = the user has not navigated the list. That distinction matters: with
  // nothing highlighted, Enter must commit exactly what was TYPED (so "sh" can
  // become its own tag even though "shop" exists); once an arrow key has moved
  // the highlight, Enter picks that suggestion instead.
  const [highlight, setHighlight] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const matches = React.useMemo(() => {
    const d = normalizeTag(draft);
    return suggestions
      .filter((s) => !value.includes(s) && (d === '' || s.includes(d)))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  // Close the suggestion list when focus leaves the whole control.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function commitDraft() {
    // A paste can carry several tags separated by comma.
    for (const part of draft.split(',')) add(part);
    setDraft('');
    setHighlight(-1);
  }

  function pick(tag: string) {
    add(tag);
    setDraft('');
    setHighlight(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      // From "nothing highlighted" the first press lands on the first item.
      setHighlight((h) => (h + 1) % matches.length);
      return;
    }
    if (e.key === 'ArrowUp' && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h < 0 ? matches.length - 1 : (h - 1 + matches.length) % matches.length));
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      // A highlighted suggestion wins — including when the input is EMPTY and
      // the owner just arrowed down the list, which is the whole point of
      // being able to arrow at all.
      if (open && highlight >= 0 && matches[highlight]) {
        e.preventDefault();
        pick(matches[highlight]);
        return;
      }
      if (e.key === 'Enter' && draft.trim()) {
        e.preventDefault();
        commitDraft();
      }
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      if (draft.trim()) commitDraft();
      return;
    }
    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        data-testid={testId}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring',
          className,
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              data-testid={`${testId}-remove-${idSafe(tag)}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
              aria-label={`Fjern tag ${tag}`}
              className="rounded-sm text-secondary-foreground/70 transition-colors hover:text-secondary-foreground"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          data-testid={`${testId}-input`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
            // Typing changes the match list, so any prior highlight is stale.
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) commitDraft();
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && matches.length > 0 && (
        <div
          data-testid={`${testId}-suggestions`}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {matches.map((s, i) => (
            <button
              key={s}
              type="button"
              data-testid={`${testId}-suggestion-${idSafe(s)}`}
              // onMouseDown so the pick lands before the input's blur fires.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                i === highlight
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
