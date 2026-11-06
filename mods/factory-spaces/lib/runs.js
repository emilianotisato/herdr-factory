// factory's runs, read from `factory status --json --recent`, and what each run's
// strip under its space shows. Colors are theme names; the caller resolves them.

export const MIN_FACTORY = "0.13.0";
export const TOO_OLD = "factory too old · factory upgrade";
export const STRIP_HEIGHT = 34;
export const TOO_OLD_HEIGHT = 18;

/**
 * @typedef {{ n: number, status: string }} Slice
 * @typedef {{ id: string, at: string, n: number | null, text: string, answer: string[] }} Question
 * @typedef {{
 *   id: string, feature: string, phase: string, repo: string, slug: string | null, title: string | null,
 *   startedAt: string | null, elapsedSeconds: number, slices: Slice[] | null,
 *   budget: { used: number, limit: number } | null,
 *   checkpoints: { done: number, lastGate: string | null } | null,
 *   pr: string | null, ci: string | null, pausedUntil: string | null, parked: string | null,
 *   driverDead: boolean, stopped: boolean, questions: Question[]
 * }} Run
 * @typedef {{ kind: "ok", runs: Run[] } | { kind: "old", version: string } | { kind: "none" }} Status
 * @typedef {"building" | "owner" | "paused" | "parked" | "dead" | "shipped" | "failed"} State
 * @typedef {{ kind: "text", text: string, color: string, fill?: boolean }} TextPart
 * @typedef {TextPart
 *   | { kind: "bar", colors: string[], dim: boolean }
 *   | { kind: "control", text: string, action: "answer" | "dismiss" }} Part
 * @typedef {{
 *   id: string, state: State, tone: string, title: string | null,
 *   first: Part[], second: Part[], gauge: number | null, gaugeColor: string, gate: string | null
 * }} Strip
 * @typedef {{ id: string, top: string | null, repo: boolean }} Place
 * @typedef {{ old: boolean, strips: Strip[] }} Lane
 */

/** @type {Status} */
export const NONE = { kind: "none" };

/** Most urgent first; the rail's dot takes the first. */
const RANK = {
  owner: 0,
  dead: 1,
  failed: 2,
  parked: 3,
  paused: 4,
  building: 5,
  shipped: 6,
};
const TONE = {
  owner: "blocked",
  dead: "blocked",
  failed: "blocked",
  parked: "muted",
  paused: "muted",
  building: "working",
  shipped: "done",
};
/** @type {Record<string, string>} */
const SEGMENT = { done: "done", building: "working", blocked: "blocked" };
/** @type {Record<string, string>} */
const GATE = { green: "done", red: "blocked" };
/** @type {Record<string, string>} */
const CI = { green: "done", red: "blocked", pending: "working", none: "dim" };

/**
 * True when `version` is below `min`, or is not a version at all.
 * @param {unknown} version
 * @param {string} [min]
 */
export function olderThan(version, min = MIN_FACTORY) {
  const parts = (/** @type {string} */ v) =>
    /^(\d+)\.(\d+)\.(\d+)/.exec(v)?.slice(1).map(Number);
  const a = typeof version === "string" ? parts(version) : null;
  if (!a) return true;
  const b = parts(min);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * One envelope from `factory status --json`.
 * @param {string} stdout
 * @returns {Status}
 */
export function parseStatus(stdout) {
  let env;
  try {
    env = JSON.parse(stdout);
  } catch {
    return NONE;
  }
  if (
    !env ||
    typeof env !== "object" ||
    env.schema !== 1 ||
    !Array.isArray(env.runs)
  )
    return NONE;
  if (olderThan(env.factory))
    return { kind: "old", version: String(env.factory ?? "") };
  return {
    kind: "ok",
    runs: env.runs
      .filter((/** @type {unknown} */ r) => r && typeof r === "object")
      .map(normalize),
  };
}

/**
 * Asks factory for its runs. A factory too old for `--recent` refuses the flag,
 * so a refusal is asked again without it, to read the version from the envelope.
 * The plain listing has no finished runs, so it is never taken as the run list.
 * @param {(args: string[]) => Promise<{ code: number, stdout: string }>} ask rejects when factory is missing
 * @returns {Promise<Status | null>} null when factory gave no answer this time
 */
export async function readStatus(ask) {
  try {
    const r = await ask(["status", "--json", "--recent"]);
    if (r.code === 0) return parseStatus(r.stdout);
    const plain = await ask(["status", "--json"]);
    const s = plain.code === 0 ? parseStatus(plain.stdout) : null;
    return s?.kind === "old" ? s : null;
  } catch {
    return NONE;
  }
}

/** @param {any} r @returns {Run} */
function normalize(r) {
  const str = (/** @type {unknown} */ v) =>
    typeof v === "string" && v ? v : null;
  return {
    id: String(r.id ?? ""),
    feature: String(r.feature ?? ""),
    phase: String(r.phase ?? ""),
    repo: String(r.repo ?? ""),
    slug: str(r.slug),
    title: str(r.title),
    startedAt: str(r.startedAt),
    elapsedSeconds: Number(r.elapsedSeconds) || 0,
    slices: Array.isArray(r.slices)
      ? r.slices.map((/** @type {any} */ s) => ({
          n: Number(s?.n),
          status: String(s?.status ?? "pending"),
        }))
      : null,
    budget:
      r.budget && typeof r.budget === "object"
        ? {
            used: Number(r.budget.used) || 0,
            limit: Number(r.budget.limit) || 0,
          }
        : null,
    checkpoints:
      r.checkpoints && typeof r.checkpoints === "object"
        ? {
            done: Number(r.checkpoints.done) || 0,
            lastGate: str(r.checkpoints.lastGate),
          }
        : null,
    pr: str(r.pr),
    ci: str(r.ci),
    pausedUntil: str(r.pausedUntil),
    parked: str(r.parked),
    driverDead: r.driverDead === true,
    stopped: r.stopped === true,
    questions: Array.isArray(r.questions)
      ? r.questions
          .filter((/** @type {any} */ q) => q && q.id)
          .map((/** @type {any} */ q) => ({
            id: String(q.id),
            at: String(q.at ?? ""),
            n: typeof q.n === "number" ? q.n : null,
            text: typeof q.text === "string" ? q.text : "",
            answer: Array.isArray(q.answer)
              ? q.answer.filter(
                  (/** @type {unknown} */ a) => typeof a === "string",
                )
              : [],
          }))
      : [],
  };
}

/**
 * The strip a run shows. A live run follows factory's own status line: a question,
 * then a park, then a pause, then a dead driver. A run stopped before it opened a
 * PR counts as failed.
 * @param {Run} run
 * @returns {State}
 */
export function classify(run) {
  if (run.phase === "finished" || run.phase === "failed") {
    return run.phase === "failed" || (run.stopped && !run.pr)
      ? "failed"
      : "shipped";
  }
  if (run.questions.length) return "owner";
  if (run.parked) return "parked";
  if (run.pausedUntil) return "paused";
  if (run.driverDead) return "dead";
  return "building";
}

/** @param {number} seconds `12m`, `1h 02m` */
export function elapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** @param {string} iso local `HH:MM` */
export function clock(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** @param {string | null} url */
export function prNumber(url) {
  const m = url ? /\/pull\/(\d+)/.exec(url) : null;
  return m ? Number(m[1]) : null;
}

/** @param {string} text @param {string} [color] @returns {TextPart} */
const text = (text, color = "muted") => ({ kind: "text", text, color });
/** @type {Part} */
const SEP = { kind: "text", text: "·", color: "dim" };

/** @param {Run} run @param {boolean} dim @returns {Part[]} */
function bar(run, dim) {
  if (!run.slices || !run.slices.length) return [];
  return [
    {
      kind: "bar",
      colors: run.slices.map((s) => SEGMENT[s.status] ?? "dim"),
      dim,
    },
  ];
}

/** @param {Part[][]} groups the non-empty ones, with a dot between */
function joined(...groups) {
  return groups
    .filter((g) => g.length)
    .flatMap((g, i) => (i ? [SEP, ...g] : g));
}

/**
 * @param {Run} run
 * @returns {Strip}
 */
export function strip(run) {
  const state = classify(run);
  const f = run.feature;
  const live = state !== "shipped" && state !== "failed";
  /** @type {Part[]} */
  let first;
  /** @type {Part[]} */
  let second;
  switch (state) {
    case "building": {
      const done = run.slices
        ? run.slices.filter((s) => s.status === "done").length
        : 0;
      const name = [f, run.slug ?? run.title].filter(Boolean).join(" ");
      first = [
        { ...text(name, "foreground"), fill: true },
        ...(run.slices ? [text(`${done}/${run.slices.length}`)] : []),
      ];
      second = joined(
        bar(run, false),
        [text(run.phase)],
        [text(elapsed(run.elapsedSeconds))],
      );
      break;
    }
    case "owner":
      first = joined(
        [text(f, "foreground")],
        [text(`${run.questions.map((q) => q.id).join(", ")} open`, "blocked")],
      );
      second = [
        { ...text(run.questions[0].text ?? ""), fill: true },
        { kind: "control", text: "Answer", action: "answer" },
      ];
      break;
    case "paused":
      first = joined(
        [text(f, "foreground")],
        [text(`paused until ${clock(run.pausedUntil)}`)],
      );
      second = bar(run, true);
      break;
    case "parked":
      first = joined([text(f, "foreground")], [text(`parked: ${run.parked}`)]);
      second = bar(run, true);
      break;
    case "dead":
      first = joined([text(f, "foreground")], [text("driver dead", "blocked")]);
      second = [text(`factory run ${f}`)];
      break;
    case "shipped": {
      const n = prNumber(run.pr);
      const ci =
        run.ci && CI[run.ci]
          ? [text(run.ci === "none" ? "no CI" : `CI ${run.ci}`, CI[run.ci])]
          : [];
      first = joined([text(f, "foreground")], [text("shipped")]);
      second = [
        ...joined(n === null ? [] : [text(`PR #${n}`)], ci),
        { kind: "control", text: "×", action: "dismiss" },
      ];
      break;
    }
    default:
      first = joined([text(f, "foreground")], [text("failed", "blocked")]);
      second = [
        text(elapsed(run.elapsedSeconds)),
        { kind: "control", text: "×", action: "dismiss" },
      ];
  }
  if (!first.some((p) => p.kind === "text" && p.fill))
    first.push({ kind: "text", text: "", color: "dim", fill: true });
  const limit = run.budget?.limit ?? 0;
  const gauge =
    live && limit > 0
      ? Math.min(1, Math.max(0, run.budget.used / limit))
      : null;
  return {
    id: run.id,
    state,
    tone: TONE[state],
    title: run.title,
    first,
    second,
    gauge,
    gaugeColor:
      gauge !== null && run.budget.used > limit ? "blocked" : "working",
    gate: live ? (GATE[run.checkpoints?.lastGate ?? ""] ?? null) : null,
  };
}

/** @param {string} p */
const trim = (p) => p.replace(/\/+$/, "");

/**
 * What each space shows under its name. A run belongs to the space whose git top
 * level is its repo, so a worktree of that repo shows none of its runs.
 * @param {Status} status
 * @param {Place[]} places
 * @returns {Record<string, Lane>}
 */
export function bySpace(status, places) {
  /** @type {Record<string, Lane>} */
  const out = {};
  if (status.kind === "none") return out;
  for (const p of places) {
    if (status.kind === "old") {
      if (p.repo) out[p.id] = { old: true, strips: [] };
      continue;
    }
    if (!p.top) continue;
    const top = trim(p.top);
    const strips = status.runs
      .filter((r) => r.repo && trim(r.repo) === top)
      .map(strip)
      .map((s, i) => ({ s, i }))
      .sort((a, b) => RANK[a.s.state] - RANK[b.s.state] || a.i - b.i)
      .map(({ s }) => s);
    if (strips.length) out[p.id] = { old: false, strips };
  }
  return out;
}

/** @param {Lane | undefined} lane the height it adds to its space's row */
export function laneHeight(lane) {
  if (!lane) return 0;
  return lane.old ? TOO_OLD_HEIGHT : lane.strips.length * STRIP_HEIGHT;
}

/** @param {Lane | undefined} lane the rail's dot: its most urgent run's color, or null */
export function urgent(lane) {
  return lane?.strips[0]?.tone ?? null;
}
