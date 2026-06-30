import path from 'path';

/**
 * Resolve `relativeEntry` inside `dir` and guarantee the result stays within
 * `dir` (defends against `../` traversal and absolute-path escapes).
 *
 * Returns the absolute path, or `null` if it would escape `dir`.
 *
 * `dir` may itself be relative (e.g. a relative `STORAGE_PATH=./data`): both
 * sides are resolved to absolute before the boundary check, so the guard works
 * regardless of whether storage is configured with a relative or absolute path.
 */
export function resolveWithinDir(dir: string, relativeEntry: string): string | null {
  const baseDir = path.resolve(dir);
  const filePath = path.resolve(baseDir, relativeEntry);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
    return null;
  }
  return filePath;
}
