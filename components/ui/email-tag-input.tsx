'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function sanitize(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

interface EmailTagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Base for the data-testid anchors (Lens). */
  testId: string;
  className?: string;
}

/**
 * Recipient input where each address becomes a removable chip on comma / Enter
 * (or blur / paste). Gives a clear visual confirmation that several recipients
 * are queued. Invalid text stays in the draft so the user sees it wasn't added.
 */
export function EmailTagInput({
  value,
  onChange,
  placeholder,
  testId,
  className,
}: EmailTagInputProps) {
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  function commit(raw: string): boolean {
    // A paste can carry several addresses separated by comma/space/semicolon.
    const candidates = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const valid = candidates.filter(
      (c) => isValidEmail(c) && !value.includes(c),
    );
    if (valid.length > 0) {
      onChange([...value, ...valid]);
    }
    // Keep anything that didn't make it (invalid / duplicate) as the new draft.
    const leftover = candidates.filter((c) => !valid.includes(c));
    return leftover.length === 0;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      if (draft.trim() && commit(draft)) setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(email: string) {
    onChange(value.filter((v) => v !== email));
    inputRef.current?.focus();
  }

  return (
    <div
      data-testid={testId}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      {value.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {email}
          <button
            type="button"
            data-testid={`${testId}-remove-${sanitize(email)}`}
            onClick={(e) => {
              e.stopPropagation();
              remove(email);
            }}
            aria-label={`Fjern ${email}`}
            className="rounded-sm text-secondary-foreground/70 transition-colors hover:text-secondary-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="email"
        data-testid={`${testId}-input`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim() && commit(draft)) setDraft('');
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (/[,;\s]/.test(text)) {
            e.preventDefault();
            if (commit(text)) setDraft('');
            else setDraft(text.split(/[,;\s]+/).filter(Boolean).slice(-1)[0] ?? '');
          }
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[8rem] bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
