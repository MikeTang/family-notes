import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { readNotes } from "@/lib/notes";
import NotesFeed from "@/app/components/NotesFeed";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const notes = await readNotes();

  // Derive display name from email consistently with the POST handler.
  const displayName = (() => {
    const atIdx = session.email.indexOf("@");
    const local = atIdx > 0 ? session.email.slice(0, atIdx) : session.email;
    return local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  })();

  const initial = (displayName[0] ?? "?").toUpperCase();

  // Avatar colour: same deterministic palette as NotesFeed client component.
  const AVATAR_COLORS = [
    "#c4882a",
    "#6b8f5e",
    "#5b8fc9",
    "#bf6b8c",
    "#7b6abf",
    "#c47a5a",
  ];
  const avatarColor =
    AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdf8f0" }}>
      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: "#fffdf7",
          borderBottom: "1px solid #e8dfc8",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ backgroundColor: "#f5e6c8" }}
            >
              <span className="text-lg">📒</span>
            </div>
            <h1
              className="text-xl font-semibold text-stone-800"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Family Notes
            </h1>
          </div>

          {/* User + sign-out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                style={{
                  backgroundColor: avatarColor,
                  boxShadow: "0 0 0 2px #fdf8f0, 0 0 0 4px #d4a96a",
                }}
              >
                {initial}
              </div>
              <span className="text-sm text-stone-600 hidden sm:block">
                {displayName}
              </span>
            </div>
            <form action="/api/auth/sign-out" method="POST">
              <button
                type="submit"
                className="text-xs text-stone-400 hover:text-stone-600 ml-2 transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <NotesFeed initialNotes={notes} currentUserEmail={session.email} />
      </main>
    </div>
  );
}
