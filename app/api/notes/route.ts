// Shared notes API — all family members read/write the same blob.
// Protected: requires a valid session for all operations.

import { put, head, del } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export interface Note {
  id: string;
  title: string;
  body: string;
  authorEmail: string;
  /** Display name derived from email (part before @) */
  authorName: string;
  createdAt: string; // ISO-8601
}

const SHARED_BLOB = "data/shared/family-notes.json";

async function readNotes(): Promise<Note[]> {
  try {
    const meta = await head(SHARED_BLOB);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Note[];
  } catch {
    return [];
  }
}

async function writeNotes(notes: Note[]): Promise<void> {
  await put(SHARED_BLOB, JSON.stringify(notes), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

/** GET /api/notes — return all notes, newest first */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const notes = await readNotes();
  notes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return Response.json(notes);
}

/** POST /api/notes — create a new note */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    body?: string;
  } | null;

  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return new Response("title and body are required", { status: 400 });
  }

  const title = body.title.trim().slice(0, 300);
  const noteBody = body.body.trim().slice(0, 10_000);
  if (!title) return new Response("title is required", { status: 400 });

  const notes = await readNotes();

  // Derive a friendly display name from the email (part before @).
  // Edge case: malformed email → fall back to full email.
  const authorName = (() => {
    const atIdx = session.email.indexOf("@");
    const local = atIdx > 0 ? session.email.slice(0, atIdx) : session.email;
    // Capitalise first letter, replace dots/underscores/hyphens with space.
    return local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  })();

  const note: Note = {
    id: crypto.randomUUID(),
    title,
    body: noteBody,
    authorEmail: session.email,
    authorName,
    createdAt: new Date().toISOString(),
  };

  notes.push(note);
  await writeNotes(notes);

  return Response.json(note, { status: 201 });
}

/** DELETE /api/notes?id=<noteId> — remove a note by id */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response("id is required", { status: 400 });

  const notes = await readNotes();
  const filtered = notes.filter((n) => n.id !== id);
  await writeNotes(filtered);

  return new Response(null, { status: 204 });
}
