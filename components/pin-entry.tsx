'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;

interface PinEntryProps {
  token: string;
  pitchTitle: string;
}

export function PinEntry({ token, pitchTitle }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submit = useCallback(async (pin: string) => {
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();

      if (data.success) {
        // Reload page — server will now see the verified cookie and show content
        window.location.reload();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);

        if (data.locked) {
          setLocked(true);
          setError('Too many attempts. This link has been locked.');
        } else {
          const remaining = MAX_ATTEMPTS - (data.attempts ?? 0);
          setError(
            remaining <= 2
              ? `Wrong code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
              : 'Wrong code. Please try again.',
          );
          // Clear all digits
          setDigits(Array(PIN_LENGTH).fill(''));
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [token]);

  function handleChange(index: number, value: string) {
    if (locked || verifying) return;

    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && index === PIN_LENGTH - 1) {
      const pin = next.join('');
      if (pin.length === PIN_LENGTH) {
        submit(pin);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (locked || verifying) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    if (locked || verifying) return;

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;

    const next = Array(PIN_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);

    if (pasted.length === PIN_LENGTH) {
      submit(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${baseUrl}/pitch-vault-logo-light.svg`}
          alt="Pitch Vault"
          className="mx-auto mb-10 h-10 w-auto"
        />

        {/* Title */}
        <h1 className="text-lg font-semibold text-white mb-1">{pitchTitle}</h1>
        <p className="text-sm text-gray-400 mb-8">
          Enter the 6-digit code from your invitation email
        </p>

        {/* PIN inputs */}
        <div
          className={`flex justify-center gap-2.5 ${shake ? 'animate-shake' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={locked || verifying}
              className={`
                w-12 h-14 rounded-xl border-2 bg-white/5 text-center text-2xl font-bold text-white
                outline-none transition-all duration-150
                ${digit ? 'border-blue-500' : 'border-white/20'}
                ${error && !digit ? 'border-red-500/60' : ''}
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
                disabled:opacity-40 disabled:cursor-not-allowed
                placeholder:text-white/10
              `}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {/* Loading indicator */}
        {verifying && (
          <p className="mt-4 text-sm text-gray-400">Verifying…</p>
        )}

        {/* Footer */}
        <p className="mt-12 text-xs text-gray-600">
          Pitch Vault by Broberg
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
