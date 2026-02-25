import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UploadCloudIcon,
  KeyIcon,
  EyeIcon,
  MailIcon,
  BarChart3Icon,
} from 'lucide-react';

interface StepItem {
  label: string;
  note?: string;
  text: string;
}

interface Step {
  n: number;
  heading: string;
  body?: string;
  list?: StepItem[];
  code?: string;
  note?: string;
}

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  steps: Step[];
}

const sections: Section[] = [
  {
    icon: UploadCloudIcon,
    title: 'Del 1 — Upload en pitch',
    steps: [
      {
        n: 1,
        heading: 'Gå til "New Pitch"',
        body: 'Klik på Pitches i venstre sidebar, og klik derefter på knappen New Pitch øverst til højre.',
      },
      {
        n: 2,
        heading: 'Udfyld detaljer',
        list: [
          { label: 'Title', note: '(påkrævet)', text: 'Skriv et navn, f.eks. "Seed Round 2025"' },
          { label: 'Description', note: '(valgfri)', text: 'Kort beskrivelse — understøtter markdown' },
        ],
      },
      {
        n: 3,
        heading: 'Upload filer',
        body: 'Træk dine filer ind i upload-feltet, eller klik på det for at vælge filer:',
        list: [
          { label: 'HTML-præsentation', text: 'træk hele mappen ind (alle HTML/CSS/JS/billeder)' },
          { label: 'PDF', text: 'træk én PDF-fil ind' },
          { label: 'Billeder', text: 'JPG, PNG osv.' },
        ],
        note: 'Titlen udfyldes automatisk fra filnavnet, hvis du endnu ikke har skrevet en.',
      },
      {
        n: 4,
        heading: 'Klik "Create Pitch"',
        body: 'Du lander automatisk på pitch-detailsiden.',
      },
    ],
  },
  {
    icon: KeyIcon,
    title: 'Del 2 — Publicer og opret adgangslink',
    steps: [
      {
        n: 5,
        heading: 'Slå "Published" til',
        body: 'På fanen Details er der en toggle kaldet Published. Slå den til — ellers kan viewer-links ikke åbnes. Klik Save Changes.',
      },
      {
        n: 6,
        heading: 'Gå til fanen "Access"',
        body: 'Klik på Access-fanen øverst på pitch-detailsiden.',
      },
      {
        n: 7,
        heading: 'Opret et token',
        body: 'Klik New Token. En dialog åbner:',
        list: [
          { label: 'anonymous', text: 'kan deles frit med alle' },
          { label: 'personal', text: 'knyttet til en specifik e-mail' },
          { label: 'Label', note: '(valgfri)', text: 'f.eks. "Test" eller "Investor A"' },
        ],
        note: 'Tokenet vises i listen med et kopier-ikon (kopierer viewer-linket) og et ekstern-link-ikon (åbner vieweren direkte).',
      },
    ],
  },
  {
    icon: EyeIcon,
    title: 'Del 3 — Se pitchen som modtager',
    steps: [
      {
        n: 8,
        heading: 'Åbn linket i inkognito',
        body: 'Åbn en ny inkognito-fane (Cmd+Shift+N på Mac / Ctrl+Shift+N på Windows) og indsæt viewer-linket. Inkognito sikrer du ser det præcis som en ekstern modtager — uden din admin-session.',
        code: 'https://pitch.broberg.dk/view/[token]',
        note: 'HTML-præsentationer vises i en sandboxed iframe. PDF vises inline. Billeder vises responsivt.',
      },
    ],
  },
  {
    icon: MailIcon,
    title: 'Del 4 — Send invite via e-mail',
    steps: [
      {
        n: 9,
        heading: 'Send invite',
        body: 'På Access-fanen, klik Send Invite. Udfyld:',
        list: [
          { label: 'Recipient Email', text: 'modtagerens e-mail-adresse' },
          { label: 'Personal Message', note: '(valgfri)', text: 'en personlig hilsen' },
        ],
        note: 'Et personligt token oprettes automatisk, og modtageren får en e-mail med et unikt link. Kræver at RESEND_API_KEY er konfigureret.',
      },
    ],
  },
  {
    icon: BarChart3Icon,
    title: 'Del 5 — Følg med i hvem der ser pitchen',
    steps: [
      {
        n: 10,
        heading: 'Se statistik',
        body: 'Klik Stats-knappen øverst på pitch-detailsiden. Her ser du:',
        list: [
          { label: 'Visninger over tid', text: '' },
          { label: 'Hvilke tokens der er brugt', text: '' },
          { label: 'Gennemsnitlig visningstid', text: '' },
        ],
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Hjælp</h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm text-muted-foreground">
            Trin-for-trin guide til at uploade, dele og følge op på dine pitches.
          </p>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {section.steps.map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {step.n}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-sm font-medium leading-6">{step.heading}</p>
                      {step.body && (
                        <p className="text-sm text-muted-foreground">{step.body}</p>
                      )}
                      {step.list && (
                        <ul className="space-y-1">
                          {step.list.map((item) => (
                            <li key={item.label} className="flex gap-1.5 text-sm text-muted-foreground">
                              <span className="shrink-0">
                                <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                                  {item.label}
                                </Badge>
                                {item.note && (
                                  <span className="text-xs text-muted-foreground ml-1">{item.note}</span>
                                )}
                              </span>
                              {item.text && <span>— {item.text}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {step.code && (
                        <code className="block bg-muted px-3 py-2 rounded text-xs font-mono break-all">
                          {step.code}
                        </code>
                      )}
                      {step.note && (
                        <p className="text-xs text-muted-foreground italic">{step.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
