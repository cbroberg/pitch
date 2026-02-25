import fs from 'fs';
import path from 'path';
import { getPitchStoragePath, ensureDir } from '@/lib/storage';

export async function savePitchFiles(
  pitchId: string,
  files: { name: string; buffer: Buffer }[],
): Promise<void> {
  const dir = getPitchStoragePath(pitchId);
  ensureDir(dir);

  for (const file of files) {
    // Prevent path traversal
    const safeName = path.basename(file.name);
    const filePath = path.join(dir, safeName);
    fs.writeFileSync(filePath, file.buffer);
  }
}

export async function savePitchFile(
  pitchId: string,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const dir = getPitchStoragePath(pitchId);
  ensureDir(dir);
  const safeName = path.normalize(fileName).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(dir, safeName);
  const fileDir = path.dirname(filePath);
  ensureDir(fileDir);
  fs.writeFileSync(filePath, buffer);
}

export function deletePitchFiles(pitchId: string): void {
  const dir = getPitchStoragePath(pitchId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function listPitchFiles(pitchId: string): string[] {
  const dir = getPitchStoragePath(pitchId);
  if (!fs.existsSync(dir)) return [];
  return walkDir(dir, dir);
}

function walkDir(base: string, current: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(base, fullPath));
    } else {
      results.push(path.relative(base, fullPath));
    }
  }
  return results;
}

export function detectFileType(files: string[]): {
  fileType: string;
  entryFile: string | null;
} {
  const htmlFiles = files.filter((f) => f.toLowerCase().endsWith('.html'));
  const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  const imageFiles = files.filter((f) =>
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f),
  );

  if (htmlFiles.includes('index.html')) {
    return { fileType: 'html', entryFile: 'index.html' };
  }
  if (htmlFiles.length > 0) {
    return { fileType: 'html', entryFile: htmlFiles[0] };
  }
  if (pdfFiles.length > 0) {
    return { fileType: 'pdf', entryFile: pdfFiles[0] };
  }
  if (imageFiles.length > 0) {
    return { fileType: 'image', entryFile: imageFiles[0] };
  }
  if (files.length > 0) {
    return { fileType: 'other', entryFile: files[0] };
  }
  return { fileType: 'other', entryFile: null };
}
