// What this screen remembers about factory's runs: the questions it already
// alerted on, and the finished runs whose strip was dismissed. Both are kept
// only while their run is still listed.

import { classify } from "./runs.js";

/**
 * @typedef {import("./runs.js").Status} Status
 * @typedef {import("./runs.js").Run} Run
 * @typedef {{
 *   title: string, body: string, level: "warning",
 *   action?: { name: "space.select", args: { id: string } }
 * }} Toast
 * @typedef {{ key: string, toast: Toast, sound: "blocked" }} Alert
 */

/**
 * A question's identity on this screen. Question ids repeat across runs, so the
 * run's id is part of it.
 * @param {string} run
 * @param {string} question
 */
export const questionKey = (run, question) => JSON.stringify([run, question]);

/** @param {string} key @returns {string | null} the run it belongs to */
const runOf = (key) => {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) && typeof parsed[0] === "string"
      ? parsed[0]
      : null;
  } catch {
    return null;
  }
};

/**
 * The toasts and sounds for questions this screen has not alerted on, and what it
 * has alerted on after them. Without a run list (no factory, or one too old)
 * nothing alerts and nothing is forgotten.
 * @param {string[]} seen
 * @param {Status} status
 * @param {Record<string, string>} spaceOf run id -> the space it shows under
 * @returns {{ alerts: Alert[], seen: string[] }}
 */
export function alerts(seen, status, spaceOf) {
  if (status.kind !== "ok") return { alerts: [], seen };
  const listed = new Set(status.runs.map((r) => r.id));
  const kept = seen.filter((k) => listed.has(runOf(k) ?? ""));
  const known = new Set(kept);
  /** @type {Alert[]} */
  const out = [];
  for (const run of status.runs) {
    for (const q of run.questions) {
      const key = questionKey(run.id, String(q.id));
      if (known.has(key)) continue;
      known.add(key);
      const space = spaceOf[run.id];
      out.push({
        key,
        sound: "blocked",
        toast: {
          title: `${run.feature} needs you`,
          body: String(q.text ?? ""),
          level: "warning",
          ...(space
            ? { action: { name: "space.select", args: { id: space } } }
            : {}),
        },
      });
    }
  }
  return { alerts: out, seen: [...kept, ...out.map((a) => a.key)] };
}

/**
 * The runs whose strips still show: a shipped or failed run that was dismissed
 * goes; a dismissed run that is live again comes back. Dismissed ids of runs no
 * longer listed are dropped.
 * @param {string[]} dismissed
 * @param {Status} status
 * @returns {{ status: Status, dismissed: string[] }}
 */
export function undismissed(dismissed, status) {
  if (status.kind !== "ok") return { status, dismissed };
  const listed = new Set(status.runs.map((r) => r.id));
  const kept = dismissed.filter((id) => listed.has(id));
  const gone = new Set(kept);
  const finished = (/** @type {Run} */ r) => {
    const state = classify(r);
    return state === "shipped" || state === "failed";
  };
  return {
    status: {
      kind: "ok",
      runs: status.runs.filter((r) => !(gone.has(r.id) && finished(r))),
    },
    dismissed: kept,
  };
}

/**
 * A stored list of strings, or none when the stored value is missing or broken.
 * @param {string | null} raw
 * @returns {string[]}
 */
export function storedList(raw) {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
