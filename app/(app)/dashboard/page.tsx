'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
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
                  <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="flex items-center justify-between py-4 px-5">
                        <div>
                          <p className="font-medium">{pitch.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(pitch.createdAt * 1000), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {pitch.totalViews} views
                          </span>
                          <Badge variant={pitch.isPublished ? 'default' : 'secondary'}>
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
