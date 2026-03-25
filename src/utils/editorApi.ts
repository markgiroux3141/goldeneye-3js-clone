export interface SaveResult {
  ok: boolean;
  error?: string;
  path?: string;
}

/**
 * Save a JSON file directly to public/ via the Vite dev server API.
 * Falls back gracefully in production (returns ok: false).
 */
export async function saveToProject(filePath: string, content: string): Promise<SaveResult> {
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Direct save only available in dev mode' };
  }
  try {
    const res = await fetch('/__editor-api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Network error — is the dev server running?' };
  }
}

/**
 * Rename a file within public/ via the Vite dev server API.
 * Falls back gracefully in production (returns ok: false).
 */
export async function renameFile(oldPath: string, newPath: string): Promise<SaveResult> {
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Rename only available in dev mode' };
  }
  try {
    const res = await fetch('/__editor-api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Network error — is the dev server running?' };
  }
}

/** True when running on the Vite dev server (not a production build). */
export function isDevServer(): boolean {
  return import.meta.env.DEV;
}
