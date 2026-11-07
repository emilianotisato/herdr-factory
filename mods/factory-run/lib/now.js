// The words at the top of the run panel: what the run waits on from the owner,
// and the one line saying what it waits on now. Durations are measured against
// the snapshot's own `at`, never the clock.

/**
 * @typedef {{ text: string, hit: boolean }} ExcerptLine
 * @typedef {{ text: string, tone: "lead" | "plain" | "alert" }} Part
 * @typedef {{ id: string, text: string, answer: string[] }} Question
 * @typedef {{
 *   id: string,
 *   kind: string,
 *   open: string | null,
 *   title: string,
 *   body: string | null,
 *   excerpt: ExcerptLine[] | null,
 *   question: Question | null,
 * }} Block
 */

/** @param {unknown} v @returns {number | null} */
const time = (v) => {
  if (typeof v !== "string") return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

/** @param {unknown} v @returns {string | null} */
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Factory's markdown body as plain text: bold and code markers dropped.
 * @param {unknown} v
 * @returns {string | null}
 */
const plain = (v) => {
  const t = text(v);
  return t && t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`\n]+)`/g, "$1");
};

/**
 * "45s", "12m", "2h 05m", "3d 4h".
 * @param {number} seconds
 * @returns {string}
 */
export function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/**
 * Local wall-clock "HH:MM".
 * @param {number} ms
 * @returns {string}
 */
export function clock(ms) {
  const d = new Date(ms);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The time from `from` to `at`, both ISO timestamps.
 * @param {unknown} from
 * @param {unknown} at
 * @returns {string | null}
 */
export function since(from, at) {
  const a = time(from);
  const b = time(at);
  return a === null || b === null ? null : duration((b - a) / 1000);
}

/** @param {unknown} waitingOn @returns {string} */
export function lead(waitingOn) {
  const w = text(waitingOn) ?? "nothing";
  return w === "done" ? "Done" : `Waiting on ${w}`;
}

/**
 * The Now line, in order: what the run waits on first, then factory's label,
 * since when, progress, the quota's reset time, idle time, decisions, and the
 * driver and stopping states.
 * @param {Record<string, any> | null | undefined} now
 * @param {{ count?: number } | null | undefined} decisions
 * @param {unknown} at
 * @returns {Part[]}
 */
export function nowLine(now, decisions, at) {
  const n = now ?? {};
  /** @type {Part[]} */
  const parts = [{ text: lead(n.waitingOn), tone: "lead" }];
  /** @param {string | null} t @param {Part["tone"]} [tone] */
  const add = (t, tone = "plain") => {
    if (t) parts.push({ text: t, tone });
  };
  add(text(n.label));
  const held = since(n.since, at);
  add(held === null ? null : `for ${held}`);
  const p = n.progress;
  if (p && Number.isFinite(p.done) && Number.isFinite(p.of)) {
    add(`${p.done}/${p.of}`);
  }
  const resumes = time(n.resumesAt);
  add(resumes === null ? null : `resumes ${clock(resumes)}`);
  if (Number.isFinite(n.idleSeconds) && n.idleSeconds > 0) {
    add(`idle ${duration(n.idleSeconds)}`);
  }
  const count = decisions?.count;
  if (Number.isFinite(count) && count > 0) {
    add(`${count} decision${count === 1 ? "" : "s"}`);
  }
  if (n.driverAlive === false) add("driver dead", "alert");
  const st = n.stopping;
  if (st && typeof st === "object") {
    const on = text(st.on) ?? "worker";
    const what = text(st.what);
    add(`stopping, waiting on ${on}${what ? `: ${what}` : ""}`, "alert");
  }
  return parts;
}

/** @param {unknown} lines @returns {ExcerptLine[] | null} */
function excerpt(lines) {
  if (!Array.isArray(lines)) return null;
  const out = lines
    .filter((l) => l && typeof l.text === "string")
    .map((l) => ({ text: l.text, hit: l.hit === true }));
  return out.length ? out : null;
}

/**
 * One block per `attention[]` entry. Only a `block` or an `ask` gets a question
 * for the Answer dialog, which refuses an argv that is not factory's own.
 * @param {unknown} attention
 * @param {unknown} at
 * @returns {Block[]}
 */
export function attentionBlocks(attention, at) {
  if (!Array.isArray(attention)) return [];
  return attention
    .filter((a) => a && typeof a.id === "string")
    .map((a) => {
      const kind = text(a.kind) ?? "warn";
      const title = text(a.title) ?? a.id;
      const answer = Array.isArray(a.answer)
        ? a.answer.filter((/** @type {unknown} */ w) => typeof w === "string")
        : [];
      return {
        id: a.id,
        kind,
        open: since(a.openedAt, at),
        title,
        body: plain(a.body),
        excerpt: excerpt(a.reason?.excerpt),
        question:
          kind === "block" || kind === "ask"
            ? { id: a.id, text: title, answer }
            : null,
      };
    });
}
