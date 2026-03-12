import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { savePitchFile } from '@/lib/upload';
import { getPitchStoragePath } from '@/lib/storage';
import { getAnthropicClient } from '@/lib/anthropic';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { pitchId, userMessage, currentSlide, history } = body;
  // history: string[] — previous user messages in order, max ~10

  if (!pitchId || !userMessage) {
    return NextResponse.json({ error: 'pitchId and userMessage are required' }, { status: 400 });
  }

  const pitch = getPitchById(pitchId);
  if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

  const htmlPath = path.join(getPitchStoragePath(pitchId), 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return NextResponse.json({ error: 'Pitch HTML not found' }, { status: 404 });
  }
  const currentHtml = fs.readFileSync(htmlPath, 'utf-8');

  const systemPrompt = `Du er en ekspert web-designer. Du raffinerer HTML-præsentationer baseret på feedback.
Output KUN valid HTML — ingen markdown, ingen kodeblokke, ingen forklaring.
Svaret skal starte med <!DOCTYPE html> eller <html og slutte med </html>.
Bevar præsentationens overordnede struktur og stil — foretag kun de ønskede ændringer.`;

  const slideContext = currentSlide
    ? `\nBrugeren ser i øjeblikket ${currentSlide}.`
    : '';

  // Build conversation: previous turns as text only (no HTML), current turn includes full HTML
  const previousTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const prevMsg of history.slice(-8)) { // max 8 previous turns
      previousTurns.push({ role: 'user', content: prevMsg });
      previousTurns.push({ role: 'assistant', content: '[Præsentationen er opdateret]' });
    }
  }

  const currentTurn = `Her er den aktuelle HTML-præsentation:
<current_html>
${currentHtml}
</current_html>${slideContext}

Brugerens ønske: ${userMessage}`;

  try {
    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        ...previousTurns,
        { role: 'user', content: currentTurn },
      ],
    });

    let html = (message.content[0] as { type: string; text: string }).text;
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    await savePitchFile(pitchId, 'index.html', Buffer.from(html, 'utf-8'));
    return NextResponse.json({ html });
  } catch (err) {
    console.error('[refine] error', err);
    const msg = err instanceof Error ? err.message : 'Refinement failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
