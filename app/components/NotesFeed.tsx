"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import type { Note } from "@/lib/notes";

// Avatar colour palette — cycle deterministically by first letter of author name
const AVATAR_COLORS = [
  "#c4882a", // amber/gold
  "#6b8f5e", // sage green
  "#5b8fc9", // slate blue
  "#bf6b8c", // dusty rose
  "#7b6abf", // soft purple
  "#c47a5a", // terracotta
];

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) {
    const dayName = d.toLocaleDateString([], { weekday: "long" });
    return `${dayName}, ${timeStr}`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ── Single note card ────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  /** When true the card fades in on mount (used for freshly-posted notes). */
  fadeIn?: boolean;
}

function NoteCard({ note, onDelete, fadeIn = false }: NoteCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [visible, setVisible] = useState(!fadeIn);
  const [isPending, startTransition] = useTransition();

  const initial = (note.authorName[0] ?? "?").toUpperCase();
  const bgColor = avatarColor(note.authorName);

  // Trigger fade-in on mount for new notes
  useEffect(() => {
    if (fadeIn) {
      // Tiny delay so the initial opacity:0 frame is painted before we flip it
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [fadeIn]);

  async function handleConfirmDelete() {
    setCollapsing(true);
    // Let collapse animation play before removing from list
    await new Promise((r) => setTimeout(r, 300));
    startTransition(() => onDelete(note.id));
  }

  return (
    <div
      style={{
        // Collapse animation: shrink max-height + opacity
        maxHeight: collapsing ? "0" : "800px",
        opacity: collapsing ? 0 : visible ? 1 : 0,
        overflow: "hidden",
        // Fade-in uses a longer ease-out; collapse uses its own timing
        transition: collapsing
          ? "max-height 0.3s ease, opacity 0.25s ease"
          : "opacity 0.4s ease-out",
        marginBottom: collapsing ? "0" : undefined,
      }}
    >
      <div
        className="rounded-2xl p-5 transition-shadow"
        style={{
          background: "#fffdf7",
          border: "1px solid #e8dfc8",
          boxShadow:
            "0 2px 8px rgba(180,150,90,0.08), 0 1px 2px rgba(180,150,90,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 4px 16px rgba(180,150,90,0.14), 0 2px 4px rgba(180,150,90,0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 2px 8px rgba(180,150,90,0.08), 0 1px 2px rgba(180,150,90,0.06)";
        }}
      >
        {/* Card header: avatar + author + date + delete */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: bgColor }}
            >
              {initial}
            </div>
            <div>
              <span className="text-sm font-medium text-stone-700">
                {note.authorName}
              </span>
              <span className="text-stone-300 mx-1.5">·</span>
              <span className="text-xs text-stone-400">
                {formatDate(note.createdAt)}
              </span>
            </div>
          </div>

          {!confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-stone-300 hover:text-red-400 transition flex-shrink-0 mt-0.5"
            >
              Delete
            </button>
          )}
        </div>

        {/* Note content */}
        <h3
          className="text-lg font-semibold text-stone-800 mb-1.5"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {note.title}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-wrap">
          {note.body}
        </p>

        {/* Inline delete confirmation */}
        {confirming && (
          <div
            className="rounded-xl px-4 py-3 mt-4 flex items-center justify-between gap-3"
            style={{
              background: "#fff5f5",
              border: "1px solid #fca5a5",
            }}
          >
            <p className="text-sm text-red-500 font-medium">
              Delete this note?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 transition"
              >
                Keep it
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending || collapsing}
                className="px-3 py-1.5 rounded-lg text-xs text-white font-medium transition disabled:opacity-50"
                style={{ backgroundColor: "#ef4444" }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Note compose form ───────────────────────────────────────────────────

interface ComposeProps {
  onPost: (note: Note) => void;
  onCancel: () => void;
}

function ComposeNote({ onPost, onCancel }: ComposeProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand the textarea to fit its content
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [body, autoResize]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Something went wrong.");
        return;
      }
      const note = (await res.json()) as Note;
      onPost(note);
    } catch {
      setError("Couldn't save the note. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    /*
     * Compose card — matches the mockup:
     * - note-card base (warm white bg, warm border)
     * - 2px amber/gold full border accent (overrides note-card 1px border)
     * - terracotta left-border accent per Iris's form spec: 4px left border in #c47a5a
     */
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "#fffdf7",
        border: "2px solid #d4a96a",
        borderLeft: "5px solid #c47a5a", // terracotta left-border accent
        boxShadow:
          "0 2px 8px rgba(180,150,90,0.08), 0 1px 2px rgba(180,150,90,0.06)",
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 mb-3">
        ✏️ New Note
      </p>
      <form onSubmit={handlePost}>
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give it a title…"
          maxLength={300}
          required
          autoFocus
          className="w-full text-base font-semibold text-stone-800 placeholder-stone-300 bg-transparent border-none outline-none mb-3"
          style={{ fontFamily: "'Lora', serif" }}
        />

        {/* Body — auto-expanding, paper-lines background */}
        <div
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 27px, #ede6d6 27px, #ede6d6 28px)",
            backgroundPosition: "0 36px",
          }}
        >
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              autoResize();
            }}
            onInput={autoResize}
            placeholder="What's on your mind?"
            rows={3}
            maxLength={10_000}
            className="w-full text-sm text-stone-600 placeholder-stone-300 bg-transparent border-none outline-none resize-none leading-7 pt-1"
            style={{ overflow: "hidden", minHeight: "84px" }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-600 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={posting || !title.trim()}
            className="px-5 py-2 rounded-lg text-sm text-white font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#c4882a" }}
          >
            {posting ? "Posting…" : "Add Note"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Notes feed ──────────────────────────────────────────────────────────────

interface NotesFeedProps {
  initialNotes: Note[];
  currentUserEmail: string;
}

export default function NotesFeed({
  initialNotes,
  currentUserEmail: _currentUserEmail,
}: NotesFeedProps) {
  // Track which note IDs were just posted so we can apply the fade-in
  const [newNoteIds, setNewNoteIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [composing, setComposing] = useState(false);

  function handleDelete(id: string) {
    // Fire-and-forget server call; update UI immediately (optimistic)
    fetch(`/api/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      console.error
    );
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handlePost(note: Note) {
    // Mark this note for fade-in animation, then prepend it
    setNewNoteIds((prev) => new Set(prev).add(note.id));
    setNotes((prev) => [note, ...prev]);
    setComposing(false);
    // Remove the fade-in marker after the animation completes (500 ms)
    setTimeout(() => {
      setNewNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
    }, 500);
  }

  function handleCancel() {
    setComposing(false);
  }

  return (
    <div>
      {/* Page title + New Note button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl text-stone-800"
            style={{ fontFamily: "'Lora', serif" }}
          >
            The Family Board
          </h2>
          <p className="text-stone-400 text-sm mt-0.5">
            {notes.length === 0
              ? "No notes yet — be the first!"
              : `${notes.length} note${notes.length === 1 ? "" : "s"} from your family`}
          </p>
        </div>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#c4882a" }}
          >
            <span className="text-base leading-none">+</span>
            New Note
          </button>
        )}
      </div>

      {/* Compose form — shown above the feed when composing */}
      {composing && (
        <ComposeNote onPost={handlePost} onCancel={handleCancel} />
      )}

      {/* Notes feed */}
      {notes.length === 0 && !composing ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-3">📒</div>
          <p className="text-sm">The board is empty. Add the first note!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              fadeIn={newNoteIds.has(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
