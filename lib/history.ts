export type HistoryEntry = {
  url: string;
  score: number;
  pageTypeLabel: string;
  timestamp: number;
};

const KEY = "citebench.history.v1";
const MAX_ENTRIES = 5;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        e &&
        typeof e.url === "string" &&
        typeof e.score === "number" &&
        typeof e.pageTypeLabel === "string" &&
        typeof e.timestamp === "number",
    );
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...getHistory().filter((e) => e.url !== entry.url)].slice(
    0,
    MAX_ENTRIES,
  );
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, blocked); non-fatal
  }
  return next;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
