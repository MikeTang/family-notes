// Shared notes storage layer — used by both the /api/notes route handler and
// the home page's server component. Keeping it in /lib avoids the prior
// anti-pattern of having the page do a self-HTTP fetch to /api/notes (which
// failed in production because process.env.VERCEL_URL points at the
// deployment-specific *.vercel.app domain and our cookies don't flow there).

import { put, head } from "@vercel/blob";

export interface Note {
  id: string;
  title: string;
  body: string;
  authorEmail: string;
  /** Display name derived from email (part before @) */
  authorName: string;
  createdAt: string; // ISO-8601
}

export const SHARED_BLOB = "data/shared/family-notes.json";

/** Read all notes from the shared blob, newest first. Empty array if none. */
export async function readNotes(): Promise<Note[]> {
  try {
    const meta = await head(SHARED_BLOB);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return [];
    const notes = (await res.json()) as Note[];
    return notes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/** Overwrite the shared blob with the given notes array. */
export async function writeNotes(notes: Note[]): Promise<void> {
  await put(SHARED_BLOB, JSON.stringify(notes), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}
