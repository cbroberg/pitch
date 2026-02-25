import path from 'path';
import fs from 'fs';

export function getDataDir(): string {
  return process.env.STORAGE_PATH || path.join(process.cwd(), 'data');
}

export function getPitchStoragePath(pitchId: string): string {
  return path.join(getDataDir(), 'pitches', pitchId);
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
