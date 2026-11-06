// What `factory status --json --recent` must say about each fixture run that
// factory-fixtures.sh builds. Run as a script with the wrapper's path to check
// a live fixture dir: node tests/fixtures/check-fixtures.js <dir>/bin/factory
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const quiet = {
  questions: [],
  driverDead: false,
  pausedUntil: null,
  parked: null,
  pr: null,
  ci: null,
};

/** Keyed by run id suffix; the id's date part is the day the fixtures were built. */
export const expected = {
  a001: {
    state: "building",
    repo: "shop",
    phase: "building",
    slices: 10,
    ...quiet,
  },
  a002: {
    state: "owner needed",
    repo: "shop",
    phase: "waiting-owner",
    slices: 4,
    ...quiet,
    questions: ["BLOCK-1"],
  },
  a003: {
    state: "shipped",
    repo: "shop",
    phase: "finished",
    slices: 3,
    ...quiet,
    pr: "https://github.com/example/shop/pull/100",
    ci: "green",
  },
  b001: {
    state: "paused",
    repo: "api",
    phase: "paused",
    slices: 5,
    ...quiet,
    pausedUntil: "set",
  },
  b002: {
    state: "parked",
    repo: "api",
    phase: "waiting-owner",
    slices: 3,
    ...quiet,
    parked: "budget",
  },
  b003: {
    state: "driver dead",
    repo: "api",
    phase: "building",
    slices: 4,
    ...quiet,
    driverDead: true,
  },
  b004: { state: "failed", repo: "api", phase: "failed", slices: 3, ...quiet },
  c001: {
    state: "building, no space",
    repo: "loner",
    phase: "building",
    slices: 2,
    ...quiet,
  },
};

/**
 * @param {{ schema: number, runs: Array<Record<string, any>> }} payload
 * @returns {string[]} one line per mismatch; empty when every fixture run is as expected
 */
export function checkRuns(payload) {
  const problems = [];
  if (payload.schema !== 1) problems.push(`schema ${payload.schema}, want 1`);
  const bySuffix = new Map(payload.runs.map((r) => [r.id.slice(-4), r]));
  for (const [suffix, want] of Object.entries(expected)) {
    const run = bySuffix.get(suffix);
    if (!run) {
      problems.push(`${suffix} (${want.state}): missing`);
      continue;
    }
    const got = {
      repo: run.repo.split("/").pop(),
      phase: run.phase,
      slices: run.slices?.length ?? null,
      questions: run.questions.map((/** @type {{ id: string }} */ q) => q.id),
      driverDead: run.driverDead,
      pausedUntil: run.pausedUntil && "set",
      parked: run.parked,
      pr: run.pr,
      ci: run.ci,
    };
    for (const [field, value] of Object.entries(got)) {
      const w = JSON.stringify(want[field]);
      const g = JSON.stringify(value);
      if (w !== g)
        problems.push(`${run.id} (${want.state}): ${field} ${g}, want ${w}`);
    }
  }
  for (const id of bySuffix.keys()) {
    if (!(id in expected)) problems.push(`unexpected run ${id}`);
  }
  return problems;
}

/** @param {string} wrapper the fixture dir's bin/factory */
export function statusOf(wrapper) {
  return JSON.parse(
    execFileSync(wrapper, ["status", "--json", "--recent"], {
      encoding: "utf8",
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const wrapper = process.argv[2];
  if (!wrapper) {
    console.error("usage: node check-fixtures.js <fixtures>/bin/factory");
    process.exit(2);
  }
  const problems = checkRuns(statusOf(wrapper));
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log(`fixtures: ${Object.keys(expected).length} runs as expected`);
}
