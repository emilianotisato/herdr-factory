// One text row per worker of a run's live snapshot. Every field factory derives
// from Claude Code's stream may be null, and a null field stays a blank: the
// rows report what factory says and never judge a silence.

/**
 * @typedef {{
 *   who: string | null,
 *   doing: string | null,
 *   narration: string | null,
 *   running: string | null,
 *   lastWrite: string | null,
 *   alive: boolean,
 * }} WorkerRow
 */

/** @param {unknown} v @returns {string | null} */
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** @param {unknown} v @returns {string | null} */
const part = (v) =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : text(v);

/**
 * `570` → `9m 30s`, `45` → `45s`, `3900` → `1h 5m`.
 * @param {number} seconds
 * @returns {string}
 */
export function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** @param {any} w @returns {string | null} */
function who(w) {
  const slice = part(w.slice);
  const checkpoint = part(w.checkpoint);
  const role = text(w.role);
  const unit = slice
    ? `slice ${slice}`
    : checkpoint
      ? `checkpoint ${checkpoint}`
      : null;
  const parts = [
    role && unit?.startsWith(`${role} `) ? null : role,
    unit,
    text(w.job),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** @param {any} running @returns {string | null} */
function running(running) {
  const s = running?.elapsedSeconds;
  return typeof s === "number" && Number.isFinite(s)
    ? `running ${duration(s)}`
    : null;
}

/** @param {unknown} lastWriteAt @param {unknown} at @returns {string | null} */
function lastWrite(lastWriteAt, at) {
  if (typeof lastWriteAt !== "string" || typeof at !== "string") return null;
  const ms = Date.parse(at) - Date.parse(lastWriteAt);
  if (!Number.isFinite(ms)) return null;
  return `last write ${duration(ms / 1000)} ago`;
}

/**
 * The rows for `workers[]`, in its order, with times read against the
 * snapshot's `at` rather than the clock.
 * @param {unknown} workers
 * @param {unknown} at
 * @returns {WorkerRow[]}
 */
export function workerRows(workers, at) {
  if (!Array.isArray(workers)) return [];
  return workers
    .filter((w) => w && typeof w === "object")
    .map((w) => ({
      who: who(w),
      doing: text(w.doing?.label) ?? text(w.doing?.tool),
      narration: text(w.narration),
      running: running(w.running),
      lastWrite: lastWrite(w.lastWriteAt, at),
      alive: w.alive === true,
    }));
}
