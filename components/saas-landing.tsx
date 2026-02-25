'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  KeyIcon,
  MailIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  UploadCloudIcon,
  EyeIcon,
  Menu,
  X,
} from 'lucide-react';

export function SaasLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <FooterSection />
    </div>
  );
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/60 h-16 flex items-center">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex justify-between items-center">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Image src="/logo.svg" alt="Pitch Vault" width={140} height={32} className="h-8 w-auto" unoptimized />
        </a>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white" asChild>
            <Link href="/login">Get started</Link>
          </Button>
        </div>

        <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-16 left-0 w-full bg-card border-b border-border p-4 flex flex-col gap-3 md:hidden shadow-lg">
          <Link href="/login" className="flex items-center justify-center border border-border py-2 rounded-lg font-medium">
            Sign in
          </Link>
          <Link href="/login" className="w-full bg-indigo-500 text-white py-2 rounded-lg font-medium text-center block">
            Get started
          </Link>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-400">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          Self-hosted · No subscriptions · Your data
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Share pitches.<br />
            <span className="text-indigo-400">Control access.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Upload your pitch decks once. Share with token-protected links,
            track who viewed them, and revoke access anytime.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white px-8" asChild>
            <Link href="/login">Open dashboard</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          HTML presentations · PDF decks · Images · CLI upload
        </p>
      </div>
    </section>
  );
}

const features = [
  {
    icon: KeyIcon,
    title: 'Token-protected links',
    description: 'Create anonymous or personal access links with optional expiry and use limits. Revoke instantly.',
  },
  {
    icon: MailIcon,
    title: 'Email invites',
    description: 'Send branded invitation emails directly from the dashboard. Each recipient gets a unique link.',
  },
  {
    icon: BarChart3Icon,
    title: 'View analytics',
    description: 'See who opened your pitch, when, and for how long. Per-token tracking across all your decks.',
  },
  {
    icon: UploadCloudIcon,
    title: 'CLI upload',
    description: 'Push pitch decks from the terminal with `pitch push`. Integrates into your existing workflow.',
  },
  {
    icon: EyeIcon,
    title: 'Inline viewer',
    description: 'HTML presentations run in a sandboxed iframe. PDFs embed natively. No downloads required.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Self-hosted',
    description: 'Runs on Fly.io or your own server. SQLite storage. Your pitches never leave your infrastructure.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 border-t border-border/60">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
          <p className="text-muted-foreground">Built for founders and sales teams who share confidential decks.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <f.icon className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Upload your pitch', body: 'Drag in an HTML folder, PDF, or image. The CLI lets you push directly from your terminal.' },
    { n: '02', title: 'Create an access link', body: 'Generate a token link — anonymous for broad sharing, or personal tied to a specific email.' },
    { n: '03', title: 'Share & track', body: 'Send the link or email it directly. Watch view events roll in with timestamps and duration.' },
  ];

  return (
    <section className="py-20 px-4 border-t border-border/60">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="space-y-3">
              <span className="text-4xl font-bold text-indigo-500/30">{s.n}</span>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-4">
          <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white px-10" asChild>
            <Link href="/login">Open dashboard →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-border/60 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Image src="/logo.svg" alt="Pitch Vault" width={100} height={24} className="h-6 w-auto opacity-60" unoptimized />
        <p>Pitch Vault by Broberg · Self-hosted</p>
      </div>
    </footer>
  );
}
