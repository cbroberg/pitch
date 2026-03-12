import fs from 'fs';
import path from 'path';
import { getPitchStoragePath, getTemplateStoragePath, ensureDir } from '@/lib/storage';

export function copyPitchToTemplate(pitchId: string, templateId: string): void {
  const src = getPitchStoragePath(pitchId);
  const dest = getTemplateStoragePath(templateId);
  ensureDir(dest);

  if (!fs.existsSync(src)) return;

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);
    if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

export function listTemplateFiles(templateId: string): string[] {
  const dir = getTemplateStoragePath(templateId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => {
    return fs.statSync(path.join(dir, f)).isFile();
  });
}

export function readTemplateFile(templateId: string, filename: string): Buffer | null {
  const filePath = path.join(getTemplateStoragePath(templateId), filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function deleteTemplateFiles(templateId: string): void {
  const dir = getTemplateStoragePath(templateId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
}
