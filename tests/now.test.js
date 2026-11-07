import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attentionBlocks,
  clock,
  duration,
  lead,
  nowLine,
  since,
} from "../mods/factory-run/lib/now.js";

const AT = "2026-11-07T15:00:00Z";
const nowOf = (extra = {}) => ({
  waitingOn: "worker",
  label: "slice 3 building",
  since: "2026-11-07T14:48:00Z",
  progress: null,
  resumesAt: null,
  idleSeconds: 0,
  driverAlive: true,
  stopping: null,
  ...extra,
});
const texts = (parts) => parts.map((p) => p.text);
const line = (extra, decisions = { count: 0 }) =>
  texts(nowLine(nowOf(extra), decisions, AT));

for (const w of [
  "owner",
  "worker",
  "gate",
  "review",
  "ci",
  "quota",
  "budget",
  "driver",
  "nothing",
]) {
  test(`a run waiting on ${w} leads with it`, () => {
    const parts = nowLine(nowOf({ waitingOn: w }), null, AT);
    assert.equal(parts[0].text, `Waiting on ${w}`);
    assert.equal(parts[0].tone, "lead");
  });
}

test("a finished run leads with Done", () => {
  assert.equal(line({ waitingOn: "done" })[0], "Done");
});

test("a missing waitingOn reads as nothing", () => {
  assert.equal(lead(undefined), "Waiting on nothing");
  assert.equal(texts(nowLine(null, null, AT))[0], "Waiting on nothing");
});

test("the label and how long it has waited follow the lead", () => {
  assert.deepEqual(line({}), [
    "Waiting on worker",
    "slice 3 building",
    "for 12m",
  ]);
});

test("a quota park reads its reset time, a budget park has none", () => {
  const resumesAt = "2026-11-07T19:05:00Z";
  assert.ok(
    line({ waitingOn: "quota", resumesAt }).includes(
      `resumes ${clock(Date.parse(resumesAt))}`,
    ),
  );
  assert.ok(
    !line({ waitingOn: "budget" }).some((t) => t.startsWith("resumes")),
  );
});

test("progress reads done/of", () => {
  assert.ok(
    line({ waitingOn: "review", progress: { done: 7, of: 12 } }).includes(
      "7/12",
    ),
  );
  assert.ok(!line({ progress: { done: 7 } }).some((t) => t.includes("/")));
});

test("idle time and the decision count", () => {
  const l = line({ idleSeconds: 185 }, { count: 14 });
  assert.ok(l.includes("idle 3m"));
  assert.ok(l.includes("14 decisions"));
  assert.ok(line({}, { count: 1 }).includes("1 decision"));
  assert.ok(!line({}).some((t) => t.includes("decision")));
});

test("a dead driver says so as an alert", () => {
  const parts = nowLine(nowOf({ driverAlive: false }), null, AT);
  assert.deepEqual(parts.at(-1), { text: "driver dead", tone: "alert" });
  assert.ok(!line({}).includes("driver dead"));
});

test("a stopping run says what it waits on", () => {
  assert.ok(
    line({ stopping: { on: "gate", what: "make gate" } }).includes(
      "stopping, waiting on gate: make gate",
    ),
  );
  assert.ok(
    line({ stopping: { on: "worker", what: null } }).includes(
      "stopping, waiting on worker",
    ),
  );
});

test("durations and clock times", () => {
  assert.equal(duration(-4), "0s");
  assert.equal(duration(45), "45s");
  assert.equal(duration(125 * 60), "2h 05m");
  assert.equal(duration(76 * 3600), "3d 4h");
  assert.equal(since("2026-11-07T14:59:15Z", AT), "45s");
  assert.equal(since("not a time", AT), null);
  assert.equal(since(undefined, AT), null);
  const d = new Date(2026, 10, 7, 9, 5);
  assert.equal(clock(d.getTime()), "09:05");
});

const blockEntry = {
  id: "BLOCK-1",
  kind: "block",
  openedAt: "2026-11-07T14:20:00Z",
  title: "Checkout total rounds wrong",
  body: "The gate fails on the cents test.",
  reason: {
    source: "gate",
    log: "gate-1.log",
    excerpt: [
      { text: "  expected 10.05", hit: false },
      { text: "  got 10.0499", hit: true },
    ],
  },
  answer: ["factory", "answer", "--feature", "004", "004-x-a002", "BLOCK-1"],
};

test("a block carries its kind, open time, text, excerpt and a question", () => {
  const [b] = attentionBlocks([blockEntry], AT);
  assert.deepEqual(b, {
    id: "BLOCK-1",
    kind: "block",
    open: "40m",
    title: "Checkout total rounds wrong",
    body: "The gate fails on the cents test.",
    excerpt: [
      { text: "  expected 10.05", hit: false },
      { text: "  got 10.0499", hit: true },
    ],
    question: {
      id: "BLOCK-1",
      text: "Checkout total rounds wrong",
      answer: blockEntry.answer,
    },
  });
});

test("an ask gets Answer too, a warn does not", () => {
  const [ask, warn] = attentionBlocks(
    [
      { id: "ASK-2", kind: "ask", title: "Which currency?", answer: null },
      { id: "WARN-1", kind: "warn", title: "Disk nearly full" },
    ],
    AT,
  );
  assert.deepEqual(ask.question, {
    id: "ASK-2",
    text: "Which currency?",
    answer: [],
  });
  assert.equal(warn.question, null);
});

test("a park shows its title as its reason, with no excerpt", () => {
  const [park] = attentionBlocks(
    [
      {
        id: "PARK-1",
        kind: "park",
        openedAt: "2026-11-07T13:00:00Z",
        title: "Weekly token budget spent",
        body: null,
        reason: { source: "budget", log: null, excerpt: null },
        answer: null,
      },
    ],
    AT,
  );
  assert.equal(park.title, "Weekly token budget spent");
  assert.equal(park.open, "2h 00m");
  assert.equal(park.excerpt, null);
  assert.equal(park.body, null);
  assert.equal(park.question, null);
});

test("entries without an id are dropped, a missing title falls back to it", () => {
  const blocks = attentionBlocks(
    [null, { kind: "warn" }, { id: "W-3", reason: { excerpt: [] } }],
    AT,
  );
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].title, "W-3");
  assert.equal(blocks[0].kind, "warn");
  assert.equal(blocks[0].excerpt, null);
  assert.equal(blocks[0].open, null);
  assert.deepEqual(attentionBlocks(undefined, AT), []);
});
