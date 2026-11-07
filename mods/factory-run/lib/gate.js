// The gate, CI and timeline part of the run panel, as plain rows to draw.
// Durations are measured against the snapshot's own `at`, never the clock.
import { clock, duration, since } from "./now.js";

export const TAIL_LINES = 8;
export const FIX_EMPTY = "fix changed nothing";

/**
 * @typedef {import("./now.js").ExcerptLine} ExcerptLine
 * @typedef {"running" | "red" | "green" | "stopped"} GateState
 * @typedef {{
 *   state: GateState,
 *   head: string[],
 *   tail: string[] | null,
 *   excerpt: ExcerptLine[] | null,
 *   note: string | null,
 * }} GateView
 * @typedef {{
 *   state: string,
 *   head: string[],
 *   checks: string[],
 *   excerpt: ExcerptLine[] | null,
 * }} CiView
 * @typedef {"blocked" | "done" | "muted"} ToneKey
 * @typedef {{ seq: number, time: string, label: string, color: ToneKey }} TimelineRow
 */

/** @type {Record<string, ToneKey>} */
const TONES = {
  owner: "blocked",
  red: "blocked",
  green: "done",
  info: "muted",
};

/** @type {Record<string, string>} */
const CI_WORDS = {
  waiting: "waiting",
  red: "red",
  green: "green",
  noChecks: "no checks",
};

/** @param {unknown} v @returns {string | null} */
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** @param {unknown} v @returns {number | null} */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * @param {unknown} lines
 * @returns {ExcerptLine[]}
 */
function excerptLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((l) => l && typeof l === "object")
    .map((l) => ({
      text: typeof l.text === "string" ? l.text : "",
      hit: l.hit === true,
    }));
}

/**
 * A tone's theme color key; an unknown tone is muted.
 * @param {unknown} tone
 * @returns {ToneKey}
 */
export const toneKey = (tone) =>
  (typeof tone === "string" && Object.hasOwn(TONES, tone) && TONES[tone]) ||
  "muted";

/**
 * The gate as the panel draws it: while it runs its last tail lines, when red
 * its excerpt, once green only its head line. A red gate whose log matched no
 * excerpt line shows its tail instead, and a gate that stopped with no result
 * (its driver died mid-run) shows its tail too.
 * @param {Record<string, any> | null | undefined} gate
 * @param {unknown} at the snapshot's `at`
 * @returns {GateView | null}
 */
export function gateView(gate, at) {
  if (!gate || typeof gate !== "object") return null;
  /** @type {GateState} */
  const state = gate.running
    ? "running"
    : gate.red === true
      ? "red"
      : gate.red === false
        ? "green"
        : "stopped";
  const n = num(gate.n);
  const attempt = num(gate.attempt);
  const head = [n === null ? "Gate" : `Gate ${n}`];
  if (attempt !== null) head.push(`attempt ${attempt}`);
  if (state === "running") {
    const cmd = text(gate.cmd);
    if (cmd) head.push(cmd);
    const elapsed = since(gate.startedAt, at);
    if (elapsed) head.push(`running ${elapsed}`);
    else head.push("running");
  } else if (state === "stopped") {
    head.push("stopped with no result");
  } else {
    const minutes = num(gate.minutes);
    head.push(
      minutes === null ? state : `${state} in ${duration(minutes * 60)}`,
    );
    if (gate.cached) head.push("cached");
  }
  const excerpt = state === "red" ? excerptLines(gate.excerpt) : null;
  const tail =
    state === "running" ||
    state === "stopped" ||
    (state === "red" && !excerpt?.length)
      ? (Array.isArray(gate.tail) ? gate.tail : [])
          .map((l) => (typeof l === "string" ? l : ""))
          .slice(-TAIL_LINES)
      : null;
  return {
    state,
    head,
    tail,
    excerpt,
    note: state === "red" && gate.fixEmpty ? FIX_EMPTY : null,
  };
}

/**
 * CI as the panel draws it, or null when the run has no CI yet.
 * @param {Record<string, any> | null | undefined} ci
 * @returns {CiView | null}
 */
export function ciView(ci) {
  const state = text(ci?.state);
  if (!ci || !state || state === "none") return null;
  const head = [`CI ${CI_WORDS[state] ?? state}`];
  const round = num(ci.round);
  if (round !== null) head.push(`round ${round}`);
  const checks =
    state === "waiting" && Array.isArray(ci.checks)
      ? ci.checks.filter((c) => typeof c === "string" && c.trim())
      : [];
  return {
    state,
    head,
    checks,
    excerpt: state === "red" ? excerptLines(ci.excerpt) : null,
  };
}

/**
 * The timeline newest first, without its `noise` rows.
 * @param {unknown} timeline
 * @returns {TimelineRow[]}
 */
export function timelineRows(timeline) {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .filter((r) => r && Number.isFinite(r.seq) && r.tone !== "noise")
    .sort((a, b) => b.seq - a.seq)
    .map((r) => {
      const ms = typeof r.ts === "string" ? Date.parse(r.ts) : NaN;
      return {
        seq: r.seq,
        time: Number.isFinite(ms) ? clock(ms) : "",
        label: text(r.label) ?? text(r.kind) ?? `#${r.seq}`,
        color: toneKey(r.tone),
      };
    });
}
