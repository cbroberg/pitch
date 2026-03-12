import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { createPitch, updatePitch } from '@/lib/db/queries/pitches';
import { capturePitchThumbnail } from '@/lib/screenshot';
import { getTemplateById } from '@/lib/db/queries/templates';
import { readTemplateFile } from '@/lib/template-files';
import { savePitchFile } from '@/lib/upload';
import { generateUniqueSlug } from '@/lib/slug';
import { getAnthropicClient } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, templateId, title, folderId } = body;

  if (!prompt || !title) {
    return NextResponse.json({ error: 'prompt and title are required' }, { status: 400 });
  }

  let templateHtml: string | null = null;
  if (templateId) {
    const template = getTemplateById(templateId);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    const content = readTemplateFile(templateId, 'index.html');
    if (content) templateHtml = content.toString('utf-8');
  }

  const systemPrompt = `Du er en ekspert web-designer. Du laver selvstændige HTML-præsentationer.
Output KUN valid HTML — ingen markdown, ingen kodeblokke, ingen forklaring.
Svaret skal starte med <!DOCTYPE html> eller <html og slutte med </html>.`;

  const userPrompt = templateHtml
    ? `Her er en eksempel-HTML som stil-reference. Bevar layout, farver, typografi og CSS-approach, men lav helt nyt indhold baseret på prompten nedenfor.
<template>
${templateHtml}
</template>

Lav en professionel pitch-præsentation som en enkelt selvstændig HTML-fil:
- Komplet HTML5-dokument med al CSS i <style>-tag
- Responsivt design (flexbox/grid)
- Intet eksternt (ingen CDN-links)
- Reelt, relevant indhold (ingen lorem ipsum)

Emne: ${prompt}`
    : `Lav en professionel pitch-præsentation som en enkelt selvstændig HTML-fil:
- Komplet HTML5-dokument med al CSS i <style>-tag
- Responsivt design (flexbox/grid)
- Intet eksternt (ingen CDN-links)
- Reelt, relevant indhold (ingen lorem ipsum)
- Moderne, professionelt design med mørkt eller lyst tema
- Brug sektioner: titel, problem, løsning, markeds-mulighed, team, call-to-action

Emne: ${prompt}`;

  try {
    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      temperature: 0.7 as never,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let html = (message.content[0] as { type: string; text: string }).text;
    // Strip markdown code fences if present
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const slug = await generateUniqueSlug(title);
    const pitch = createPitch({
      title,
      slug,
      folderId: folderId || null,
      isPublished: true,
    });

    await savePitchFile(pitch.id, 'index.html', Buffer.from(html, 'utf-8'));
    updatePitch(pitch.id, { fileType: 'html', entryFile: 'index.html' });

    void capturePitchThumbnail(pitch.id).catch((e) => console.error('[thumbnail]', e));

    return NextResponse.json({ pitchId: pitch.id, html }, { status: 201 });
  } catch (err) {
    console.error('[generate] error', err);
    const msg = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
