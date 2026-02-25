import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.pitchvaultrc');

interface Config {
  server?: string;
  apiKey?: string;
}

export function readConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  const existing = readConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

export function getServer(): string {
  const config = readConfig();
  const server = config.server || process.env.PITCH_VAULT_SERVER || 'http://localhost:3000';
  return server.replace(/\/$/, '');
}

export function getApiKey(): string {
  const config = readConfig();
  return config.apiKey || process.env.PITCH_VAULT_API_KEY || '';
}
