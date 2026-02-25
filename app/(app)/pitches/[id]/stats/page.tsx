'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftIcon, EyeIcon, UsersIcon, ClockIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Pitch, ViewEvent } from '@/lib/db/schema';

interface Stats {
  total: number;
  byDay: { day: string; count: number }[];
  avgDuration: number;
}

interface StatsResponse {
  pitch: Pitch;
  stats: Stats;
  events: ViewEvent[];
}

export default function PitchStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetch(`/api/stats/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <Button asChild variant="ghost" size="sm" className="-ml-1">
          <Link href={`/pitches/${id}`}>
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-base font-semibold">
          {data?.pitch.title ?? 'Stats'}
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl space-y-6">
          {!data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-48" />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Viewers</CardTitle>
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.pitch.uniqueViews}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.stats.avgDuration > 0
                        ? `${Math.floor(data.stats.avgDuration / 60)}m ${data.stats.avgDuration % 60}s`
                        : '—'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Views by Day</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.stats.byDay.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No views recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.stats.byDay.map((d) => (
                        <div key={d.day} className="flex items-center gap-3">
                          <span className="text-sm w-28 shrink-0">{d.day}</span>
                          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (d.count / Math.max(...data.stats.byDay.map((x) => x.count))) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm w-8 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>View History</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No views yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.events.map((ev) => (
                        <div key={ev.id} className="flex items-start justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">
                              {ev.email || ev.ipAddress || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ev.userAgent?.split(' ')[0] ?? ''}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>
                              {formatDistanceToNow(new Date(ev.createdAt * 1000), {
                                addSuffix: true,
                              })}
                            </p>
                            {ev.duration && (
                              <p>{Math.round(ev.duration / 60)}m {ev.duration % 60}s</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}
