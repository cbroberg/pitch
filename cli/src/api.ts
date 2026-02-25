import { getServer, getApiKey } from './config.js';

export async function apiGet(path: string) {
  const server = getServer();
  const apiKey = getApiKey();

  const res = await fetch(`${server}${path}`, {
    headers: { 'x-api-key': apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const server = getServer();
  const apiKey = getApiKey();

  const res = await fetch(`${server}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function apiUpload(path: string, form: FormData) {
  const server = getServer();
  const apiKey = getApiKey();

  const res = await fetch(`${server}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}
