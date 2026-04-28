import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } > },
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const context = (body.context as 'pre-meeting' | 'post-meeting') || 'pre-meeting';

    const pitch = getPitchById(id);
    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    if (!pitch.entryFile) {
      return NextResponse.json({ error: 'No pitch file' }, { status: 400 });
    }

    // Read pitch content
    const dir = getPitchStoragePath(id);
    const filePath = path.resolve(dir, pitch.entryFile);
    if (!filePath.startsWith(dir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract text from HTML if needed
    let textContent = content;
    if (pitch.fileType === 'html') {
      const htmlTagRegex = /<[^>]*>/g;
      const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      const styleRegex = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
      textContent = content.replace(scriptRegex, '').replace(styleRegex, '').replace(htmlTagRegex, ' ');
    }

    // Truncate to ~4000 chars for context
    const truncatedContent = textContent.slice(0, 4000);

    const promptText = context === 'post-meeting'
      ? `Du er en professionel dansk forretnings-kommunikations-ekspert.

Baseret på dette pitch-indhold skal du skrive en kort, personaliseret opfølgingsbesked på DANSK efter et møde. Beskeden skal:
- Starte med takne for mødet
- Være præcis 3-4 sætninger
- Henvise til vigtige punkter fra pitch'et som blev diskuteret
- Være varmt og professionelt tonede
- SLUT med "Med venlig hilsen" på en ny linje, efterfulgt af "Christian"

Pitch-indhold:
${truncatedContent}

Skriv KUN beskeden selv på dansk, ingen forklaringer eller præambel.`
      : `Du er en professionel dansk forretnings-kommunikations-ekspert.

Baseret på dette pitch-indhold skal du skrive en kort, personaliseret invitations-besked på DANSK til en potentiel investor. Beskeden skal:
- Være præcis 2-3 sætninger
- Fremhæve det vigtigste fra pitch'et
- Være varmt og professionelt tonede
- SLUT med "Med venlig hilsen" på en ny linje, efterfulgt af "Christian"

Pitch-indhold:
${truncatedContent}

Skriv KUN beskeden selv på dansk, ingen forklaringer eller præambel.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
    });

    const suggestion = message.content[0].type === 'text' ? message.content[0].text : '';

    // Ensure signature is included
    let finalMessage = suggestion.trim();
    if (!finalMessage.includes('Med venlig hilsen')) {
      finalMessage += '\n\nMed venlig hilsen\nChristian';
    }

    return NextResponse.json({ message: finalMessage });
  } catch (error) {
    console.error('[suggest-invite-message]', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 },
    );
  }
}
