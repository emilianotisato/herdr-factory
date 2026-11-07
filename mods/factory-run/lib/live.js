// One run's live detail, read from `factory live <id> --json`, and the state the
// panel holds between calls: the last snapshot, its timeline so far, and the
// line shown when factory cannot answer.

export const SCHEMA = 1;
export const UPGRADE = "needs factory with `live` schema 1 · factory upgrade";
export const WAIT_SECONDS = 20;
export const TIMELINE_CAP = 200;

/**
 * @typedef {{ seq: number, ts?: string, kind?: string, label?: string, tone?: string, data?: unknown }} Row
 * @typedef {Record<string, any> & { schema: number, id: string, seq?: number, timeline: Row[] }} Snapshot
 * @typedef {{ kind: "upgrade" } | { kind: "error", text: string }} Line
 * @typedef {{ id: string | null, snap: Snapshot | null, seq: number | null, line: Line | null }} Held
 * @typedef {{ code: number, stdout: string, stderr: string }} ExecResult
 * @typedef {{ kind: "snap", snap: Snapshot } | Line} Outcome
 * @typedef {{
 *   run: { id: string, feature: string | null, repo: string | null },
 *   factory: string,
 *   runs: string | null,
 *   cx: any,
 * }} SectionCtx what each section of the panel gets from it
 * @typedef {(snap: Snapshot, t: Record<string, any>, ctx: SectionCtx) => any} SectionView
 *   a section's element for this snapshot, or null to draw nothing
 * @typedef {(snap: Snapshot, ctx: SectionCtx) => void} SectionUpdate
 *   called once for each answer the panel accepts
 */

/**
 * The arguments for the next call. A first call returns at once with the last
 * 100 events; a later one waits for anything after `since`.
 * @param {string} id
 * @param {number | null} since
 * @returns {string[]}
 */
export function liveArgs(id, since) {
  const args = ["live", id, "--json"];
  if (since === null || since === undefined) return args;
  return [...args, "--since", String(since), "--wait", String(WAIT_SECONDS)];
}

/** @type {Held} */
export const EMPTY = { id: null, snap: null, seq: null, line: null };

/**
 * @param {string | null} id
 * @returns {Held}
 */
export const fresh = (id) => ({ ...EMPTY, id });

/** @param {string} text */
const firstLine = (text) =>
  String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean) ?? null;

/**
 * What one call's result means.
 * @param {ExecResult} result
 * @returns {Outcome}
 */
export function outcome(result) {
  if (result.code === 2) return { kind: "upgrade" };
  if (result.code !== 0) {
    return {
      kind: "error",
      text: firstLine(result.stderr) ?? `factory exited ${result.code}`,
    };
  }
  let snap;
  try {
    snap = JSON.parse(result.stdout);
  } catch {
    return { kind: "upgrade" };
  }
  if (!snap || typeof snap !== "object" || snap.schema !== SCHEMA) {
    return { kind: "upgrade" };
  }
  if (typeof snap.id !== "string") return { kind: "upgrade" };
  const rows = Array.isArray(snap.timeline) ? snap.timeline : [];
  return {
    kind: "snap",
    snap: {
      ...snap,
      timeline: rows.filter(
        (/** @type {any} */ r) => r && Number.isFinite(r.seq),
      ),
    },
  };
}

/**
 * The held timeline with `rows` added: one row per seq, oldest first, the
 * newest `cap` kept.
 * @param {Row[]} held
 * @param {Row[]} rows
 * @param {number} [cap]
 * @returns {Row[]}
 */
export function merge(held, rows, cap = TIMELINE_CAP) {
  /** @type {Map<number, Row>} */
  const bySeq = new Map();
  for (const r of [...held, ...rows]) bySeq.set(r.seq, r);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq).slice(-cap);
}

/**
 * The held state after one call for run `id`. An answer about another run (the
 * shown run changed while the call was out) is dropped.
 * @param {Held} held
 * @param {string} id
 * @param {ExecResult} result
 * @returns {Held}
 */
export function apply(held, id, result) {
  if (held.id !== id) return held;
  const o = outcome(result);
  if (o.kind !== "snap") return { ...held, line: o };
  if (o.snap.id !== id) return held;
  const timeline = merge(held.snap?.timeline ?? [], o.snap.timeline);
  const last = timeline.length ? timeline[timeline.length - 1].seq : null;
  const seq = Number.isFinite(o.snap.seq) ? o.snap.seq : (last ?? held.seq);
  return { id, snap: { ...o.snap, timeline }, seq, line: null };
}

/**
 * @param {any} node
 * @param {string} id
 * @returns {any}
 */
function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Whether the panel shows this mod now: the `panel` column visible and its
 * stack on `run`.
 * @param {unknown} tree layout()
 * @returns {boolean}
 */
export function shown(tree) {
  const panel = find(tree, "panel");
  if (!panel || panel.hidden) return false;
  return find(panel, "panel-body")?.active === "run";
}
