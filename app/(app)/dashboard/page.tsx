'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PresentationIcon,
  EyeIcon,
  KeyIcon,
  PlusIcon,
  ExternalLinkIcon,
  PencilIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PitchThumbnail } from '@/components/pitch-thumbnail';
import { formatDistanceToNow } from 'date-fns';
import type { Pitch } from '@/lib/db/schema';

interface Stats {
  totalPitches: number;
  totalViews: number;
  activeTokens: number;
  recentPitches: Pitch[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Dashboard</h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl space-y-6">
          {/* Stat cards: no actionable value on a phone — desktop only. On desktop
              Total Pitches links to the pitches list. */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-3">
            <Link
              href="/pitches"
              data-testid="dashboard-total-pitches-link"
              className="rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pitches</CardTitle>
                  <PresentationIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <div className="text-2xl font-bold">{stats.totalPitches}</div>
                  ) : (
                    <Skeleton className="h-8 w-16" />
                  )}
                </CardContent>
              </Card>
            </Link>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="text-2xl font-bold">{stats.totalViews}</div>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Links</CardTitle>
                <KeyIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="text-2xl font-bold">{stats.activeTokens}</div>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Pitches</h2>
              <Button asChild size="sm">
                <Link href="/pitches/new">
                  <PlusIcon className="mr-1 h-4 w-4" />
                  New Pitch
                </Link>
              </Button>
            </div>
            {!stats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats.recentPitches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <PresentationIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">No pitches yet.</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/pitches/new">Upload your first pitch</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {stats.recentPitches.map((pitch) => (
                  <div
                    key={pitch.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/pitches/${pitch.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/pitches/${pitch.id}`);
                      }
                    }}
                    className="cursor-pointer rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="flex items-center gap-3 py-3 px-3 sm:px-4">
                        <PitchThumbnail
                          pitchId={pitch.id}
                          fileType={pitch.fileType}
                          className="w-16 h-9 sm:w-24 sm:h-[54px] rounded object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{pitch.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {formatDistanceToNow(new Date(pitch.createdAt * 1000), {
                              addSuffix: true,
                            })}
                            {' · '}
                            {pitch.totalViews} views
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <Badge variant={pitch.isPublished ? 'default' : 'secondary'} className="hidden sm:inline-flex">
                            {pitch.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/pitches/${pitch.id}/edit`}>
                              <PencilIcon className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`/preview/${pitch.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
