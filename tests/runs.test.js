import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bySpace,
  classify,
  clock,
  elapsed,
  laneHeight,
  NONE,
  olderThan,
  parseStatus,
  prNumber,
  readStatus,
  spaceRuns,
  strip,
  STRIP_HEIGHT,
  TOO_OLD_HEIGHT,
  urgent,
} from "../mods/factory-spaces/lib/runs.js";

const fixture = (name) =>
  fs.readFileSync(
    path.join(import.meta.dirname, "fixtures", `status-${name}.json`),
    "utf8",
  );
const current = parseStatus(fixture("0.13.0"));
const run = (feature) => current.runs.find((r) => r.feature === feature);
const words = (parts) =>
  parts
    .map((p) => (p.kind === "bar" ? `[${p.colors.length}]` : p.text))
    .filter(Boolean)
    .join(" ");

test("a 0.13.0 envelope reads as runs", () => {
  assert.equal(current.kind, "ok");
  assert.equal(current.runs.length, 10);
});

test("factory 0.12.0 is too old", () => {
  assert.deepEqual(parseStatus(fixture("0.12.0")), {
    kind: "old",
    version: "0.12.0",
  });
});

test("versions compare by number, and a missing one is too old", () => {
  assert.equal(olderThan("0.13.0"), false);
  assert.equal(olderThan("0.13.1"), false);
  assert.equal(olderThan("1.0.0"), false);
  assert.equal(olderThan("0.9.9"), true);
  assert.equal(olderThan("0.12.10"), true);
  assert.equal(olderThan(undefined), true);
  assert.equal(olderThan("dev"), true);
});

test("output that is not a schema 1 envelope reads as no factory", () => {
  assert.equal(parseStatus("factory: command not found"), NONE);
  assert.equal(parseStatus("null"), NONE);
  assert.equal(parseStatus('{"schema":2,"factory":"9.0.0","runs":[]}'), NONE);
  assert.equal(parseStatus('{"schema":1,"factory":"0.13.0"}'), NONE);
});

test("loose fields fall back to empty values", () => {
  const s = parseStatus(
    JSON.stringify({
      schema: 1,
      factory: "0.13.0",
      runs: [null, { id: "x", slices: [{}], budget: {}, checkpoints: {} }],
    }),
  );
  assert.equal(s.runs.length, 1);
  const [r] = s.runs;
  assert.deepEqual(r.slices, [{ n: NaN, status: "pending" }]);
  assert.deepEqual(r.budget, { used: 0, limit: 0 });
  assert.equal(r.checkpoints.lastGate, null);
  assert.deepEqual(r.questions, []);
  assert.equal(classify(r), "building");
});

test("readStatus asks once when factory takes --recent", async () => {
  const asked = [];
  const s = await readStatus(async (args) => {
    asked.push(args.join(" "));
    return { code: 0, stdout: fixture("0.13.0") };
  });
  assert.equal(s.kind, "ok");
  assert.deepEqual(asked, ["status --json --recent"]);
});

test("readStatus reads the version of a factory that refuses --recent", async () => {
  const s = await readStatus(async (args) =>
    args.includes("--recent")
      ? { code: 2, stdout: "" }
      : { code: 0, stdout: fixture("0.12.0") },
  );
  assert.equal(s.kind, "old");
});

test("readStatus is no factory when it is missing, and no answer when it fails", async () => {
  assert.equal(
    await readStatus(async () => {
      throw new Error("not found");
    }),
    NONE,
  );
  assert.equal(await readStatus(async () => ({ code: 1, stdout: "" })), null);
});

test("readStatus never takes a new factory's live-only listing as the run list", async () => {
  const s = await readStatus(async (args) =>
    args.includes("--recent")
      ? { code: 1, stdout: "" }
      : { code: 0, stdout: fixture("0.13.0") },
  );
  assert.equal(s, null);
});

test("each run classifies into its strip's state", () => {
  const states = Object.fromEntries(
    current.runs.map((r) => [r.feature, classify(r)]),
  );
  assert.deepEqual(states, {
    "019": "building",
    "020": "owner",
    "021": "paused",
    "022": "parked",
    "023": "dead",
    "024": "shipped",
    "025": "failed",
    "026": "building",
    "027": "failed",
    "028": "building",
  });
});

test("an open question outranks a park, a pause and a dead driver", () => {
  const r = {
    ...run("020"),
    parked: "budget",
    pausedUntil: "2026-11-06T20:30:00Z",
    driverDead: true,
  };
  assert.equal(classify(r), "owner");
  assert.equal(classify({ ...r, questions: [] }), "parked");
  assert.equal(classify({ ...r, questions: [], parked: null }), "paused");
  assert.equal(
    classify({ ...r, questions: [], parked: null, pausedUntil: null }),
    "dead",
  );
});

test("building: name and n/m, then the slice bar, phase and elapsed", () => {
  const s = strip(run("019"));
  assert.equal(words(s.first), "019 platform-runtime 3/5");
  assert.equal(words(s.second), "[5] · building · 1h 02m");
  assert.deepEqual(s.second[0], {
    kind: "bar",
    colors: ["done", "done", "done", "working", "dim"],
    dim: false,
  });
  assert.equal(s.tone, "working");
  assert.equal(s.gauge, 0.4);
  assert.equal(s.gaugeColor, "working");
  assert.equal(s.gate, "done");
  assert.equal(s.title, "Platform runtime");
});

test("a run whose board will not open draws no slice bar", () => {
  const s = strip(run("026"));
  assert.equal(words(s.first), "026");
  assert.equal(
    [...s.first, ...s.second].some((p) => p.kind === "bar"),
    false,
  );
  assert.equal(words(s.second), "building · 1h 02m");
});

test("ten slices are ten segments", () => {
  const bar = strip(run("028")).second[0];
  assert.equal(bar.colors.length, 10);
});

test("owner needed: the block in the blocked color, the question and Answer", () => {
  const s = strip(run("020"));
  assert.equal(words(s.first), "020 · Q-1 open");
  assert.equal(s.first[2].color, "blocked");
  assert.equal(s.second[0].text, "Which index keeps the soft delete?");
  assert.equal(s.second[0].fill, true);
  assert.deepEqual(s.second[1], {
    kind: "control",
    text: "Answer",
    action: "answer",
  });
  assert.equal(s.tone, "blocked");
});

test("paused: until when, local time, and the slice bar dimmed", () => {
  const s = strip(run("021"));
  assert.equal(
    words(s.first),
    `021 · paused until ${clock("2026-11-06T20:30:00Z")}`,
  );
  assert.equal(s.second[0].dim, true);
});

test("parked: the reason, the slice bar dimmed, a full gauge", () => {
  const s = strip(run("022"));
  assert.equal(words(s.first), "022 · parked: budget");
  assert.equal(s.second[0].dim, true);
  assert.equal(s.gauge, 1);
  assert.equal(s.tone, "muted");
  assert.equal(strip(run("021")).tone, "muted");
});

test("the gauge turns blocked only once the budget is over, not at it", () => {
  const at = { used: 30000000, limit: 30000000 };
  assert.equal(strip({ ...run("019"), budget: at }).gaugeColor, "working");
  const over = { ...at, used: 30000001 };
  assert.equal(strip({ ...run("019"), budget: over }).gaugeColor, "blocked");
});

test("a blocked slice is a blocked segment", () => {
  const slices = [
    { n: 1, status: "done" },
    { n: 2, status: "blocked" },
  ];
  assert.deepEqual(strip({ ...run("019"), slices }).second[0].colors, [
    "done",
    "blocked",
  ]);
});

test("driver dead: in blocked, then the command that restarts it", () => {
  const s = strip(run("023"));
  assert.equal(words(s.first), "023 · driver dead");
  assert.equal(s.first[2].color, "blocked");
  assert.equal(words(s.second), "factory run 023");
  assert.equal(s.gate, "blocked");
});

test("shipped: the PR number, CI and ×, with no gauge or gate", () => {
  const s = strip(run("024"));
  assert.equal(words(s.first), "024 · shipped");
  assert.equal(words(s.second), "PR #100 · CI green ×");
  assert.equal(s.second[2].color, "done");
  assert.equal(s.second.at(-1).action, "dismiss");
  assert.equal(s.gauge, null);
  assert.equal(s.gate, null);
  const pending = strip({ ...run("024"), ci: "pending" });
  assert.equal(pending.second[2].color, "working");
  const red = strip({ ...run("024"), ci: "red" });
  assert.equal(words(red.second), "PR #100 · CI red ×");
  assert.equal(red.second[2].color, "blocked");
  assert.equal(
    words(strip({ ...run("024"), ci: "none" }).second),
    "PR #100 · no CI ×",
  );
  assert.equal(words(strip({ ...run("024"), ci: null, pr: null }).second), "×");
});

test("failed: in blocked, then elapsed and ×", () => {
  const s = strip(run("025"));
  assert.equal(words(s.first), "025 · failed");
  assert.equal(s.first[2].color, "blocked");
  assert.equal(words(s.second), "12m ×");
  assert.equal(words(strip(run("027")).first), "027 · failed");
  assert.equal(s.gauge, null);
  assert.equal(s.gate, null);
});

test("a run stopped after it opened a PR shows that PR as shipped", () => {
  const s = strip({
    ...run("027"),
    pr: "https://github.com/o/r/pull/7",
    ci: "red",
  });
  assert.equal(words(s.first), "027 · shipped");
  assert.equal(words(s.second), "PR #7 · CI red ×");
});

test("questions are read as text, whatever factory sends", () => {
  const env = JSON.parse(fixture("0.13.0"));
  const r = env.runs.find((x) => x.feature === "020");
  r.questions = [{ id: 7, text: { a: 1 }, answer: ["factory", 3, "answer"] }];
  const q = parseStatus(JSON.stringify(env)).runs.find(
    (x) => x.feature === "020",
  ).questions[0];
  assert.deepEqual(q, {
    id: "7",
    at: "",
    n: null,
    text: "",
    answer: ["factory", "answer"],
  });
});

test("elapsed prints minutes, then hours and padded minutes", () => {
  assert.equal(elapsed(720), "12m");
  assert.equal(elapsed(3720), "1h 02m");
  assert.equal(elapsed(0), "0m");
  assert.equal(elapsed(-5), "0m");
  assert.equal(elapsed(36000 + 3000), "10h 50m");
});

test("clock is local HH:MM, and leaves a bad time as it came", () => {
  const d = new Date("2026-11-06T20:30:00Z");
  const hhmm = (n) => String(n).padStart(2, "0");
  assert.equal(
    clock("2026-11-06T20:30:00Z"),
    `${hhmm(d.getHours())}:${hhmm(d.getMinutes())}`,
  );
  assert.equal(clock("soon"), "soon");
});

test("the PR number comes from its URL", () => {
  assert.equal(prNumber("https://github.com/example/alpha/pull/100"), 100);
  assert.equal(prNumber("https://example.com/merge"), null);
  assert.equal(prNumber(null), null);
});

const places = [
  { id: "alpha", top: "/fixtures/alpha", repo: true },
  { id: "alpha-lane", top: "/fixtures/alpha-lane-1", repo: true },
  { id: "beta", top: "/fixtures/beta/", repo: true },
  { id: "notes", top: null, repo: false },
];

test("each run shows on the space with its top level and nowhere else", () => {
  const lanes = bySpace(current, places);
  assert.deepEqual(Object.keys(lanes).sort(), ["alpha", "beta"]);
  assert.deepEqual(
    lanes.alpha.strips.map((s) => s.id.slice(0, 3)),
    ["020", "019", "028", "024"],
  );
  assert.deepEqual(
    lanes.beta.strips.map((s) => s.id.slice(0, 3)),
    ["023", "025", "027", "022", "021"],
  );
  const all = Object.values(lanes).flatMap((l) => l.strips);
  assert.equal(
    all.some((s) => s.id.startsWith("026")),
    false,
  );
});

test("a worktree of a repo shows none of its runs", () => {
  const lanes = bySpace(current, [
    { id: "lane", top: "/fixtures/alpha-lane-1", repo: true },
  ]);
  assert.deepEqual(lanes, {});
});

test("too old shows one line, only on spaces that have a repo", () => {
  const lanes = bySpace(parseStatus(fixture("0.12.0")), places);
  assert.deepEqual(Object.keys(lanes).sort(), ["alpha", "alpha-lane", "beta"]);
  assert.deepEqual(lanes.alpha, { old: true, strips: [] });
  assert.equal(laneHeight(lanes.alpha), TOO_OLD_HEIGHT);
});

test("no factory shows nothing", () => {
  assert.deepEqual(bySpace(NONE, places), {});
});

test("a lane is a strip high per run, and its dot is its most urgent run", () => {
  const lanes = bySpace(current, places);
  assert.equal(laneHeight(lanes.alpha), 4 * STRIP_HEIGHT);
  assert.equal(laneHeight(undefined), 0);
  assert.equal(urgent(lanes.alpha), "blocked");
  assert.equal(urgent(undefined), null);
  const shippedOnly = bySpace({ kind: "ok", runs: [run("024")] }, [places[0]]);
  assert.equal(urgent(shippedOnly.alpha), "done");
});

test("the space-runs key maps each space to its strips in strip order", () => {
  const lanes = bySpace(current, places);
  const value = spaceRuns(lanes, current, undefined);
  assert.deepEqual(Object.keys(value.spaces), ["alpha", "beta"]);
  assert.deepEqual(
    value.spaces.alpha,
    lanes.alpha.strips.map((s) => s.id),
  );
  assert.deepEqual(
    value.spaces.beta,
    lanes.beta.strips.map((s) => s.id),
  );
  assert.deepEqual(
    value.recent,
    current.runs.map((r) => r.id),
  );
});

test("a dismissed run stays in recent and leaves its space", () => {
  const gone = run("024").id;
  const kept = { kind: "ok", runs: current.runs.filter((r) => r.id !== gone) };
  const value = spaceRuns(bySpace(kept, places), current, null);
  assert.ok(value.recent.includes(gone));
  assert.equal(Object.values(value.spaces).flat().includes(gone), false);
});

test("the space-runs key is written only when it changes", () => {
  const lanes = bySpace(current, places);
  const first = spaceRuns(lanes, current, undefined);
  assert.notEqual(first, null);
  const stored = JSON.parse(JSON.stringify(first));
  assert.equal(spaceRuns(bySpace(current, places), current, stored), null);
  const fewer = { kind: "ok", runs: current.runs.slice(1) };
  assert.notEqual(spaceRuns(bySpace(fewer, places), fewer, stored), null);
});

test("no answer from factory writes no space-runs key", () => {
  assert.equal(spaceRuns({}, NONE, undefined), null);
  assert.equal(
    spaceRuns(
      bySpace(parseStatus(fixture("0.12.0")), places),
      parseStatus(fixture("0.12.0")),
      undefined,
    ),
    null,
  );
});
