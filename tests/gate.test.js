import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clock } from "../mods/factory-run/lib/now.js";
import {
  FIX_EMPTY,
  ciView,
  gateView,
  timelineRows,
  toneKey,
} from "../mods/factory-run/lib/gate.js";

const fixture = (/** @type {string} */ name) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/live/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

test("a red gate gives its excerpt, hits kept, and no tail", () => {
  const snap = fixture("gate-red");
  const v = gateView(snap.gate, snap.at);
  assert.equal(v?.state, "red");
  assert.equal(v?.tail, null);
  assert.deepEqual(v?.excerpt, snap.gate.excerpt);
  assert.deepEqual(
    v?.excerpt?.map((l) => l.hit),
    [true, false, true, false, true],
  );
  assert.deepEqual(v?.head, ["Gate 2", "attempt 1", "red in 1m"]);
  assert.equal(v?.note, null);
});

test("a running gate gives its attempt, command, elapsed and last 8 tail lines", () => {
  const snap = fixture("gate-running");
  assert.equal(snap.gate.tail.length, 40);
  const v = gateView(snap.gate, snap.at);
  assert.equal(v?.state, "running");
  assert.deepEqual(v?.head, ["Gate 2", "attempt 2", "make gate", "running 2m"]);
  assert.deepEqual(v?.tail, snap.gate.tail.slice(-8));
  assert.equal(v?.tail?.length, 8);
  assert.equal(v?.excerpt, null);
});

test("a running gate without a start or command still says it runs", () => {
  const v = gateView(
    { running: true, tail: ["one", 2], cmd: null, startedAt: null },
    "2026-11-07T10:00:00Z",
  );
  assert.deepEqual(v?.head, ["Gate", "running"]);
  assert.deepEqual(v?.tail, ["one", ""]);
});

test("a running gate with no tail gives no lines", () => {
  assert.deepEqual(gateView({ running: true, tail: null }, null)?.tail, []);
});

test("an empty fix adds its note to a red gate only", () => {
  const snap = fixture("gate-red");
  const v = gateView({ ...snap.gate, fixEmpty: true }, snap.at);
  assert.equal(v?.note, FIX_EMPTY);
  assert.equal(FIX_EMPTY, "fix changed nothing");
  const running = fixture("gate-running");
  assert.equal(
    gateView({ ...running.gate, fixEmpty: true }, running.at)?.note,
    null,
  );
});

test("a red gate whose log matched no excerpt line shows its tail", () => {
  const tail = Array.from({ length: 12 }, (_, i) => `line ${i}`);
  const v = gateView({ red: true, excerpt: [], tail }, null);
  assert.equal(v?.state, "red");
  assert.deepEqual(v?.excerpt, []);
  assert.deepEqual(v?.tail, tail.slice(-8));
});

test("a gate that stopped with no result is not called green", () => {
  const v = gateView(
    { n: 2, attempt: 1, running: false, red: null, tail: ["last"] },
    null,
  );
  assert.equal(v?.state, "stopped");
  assert.deepEqual(v?.head, ["Gate 2", "attempt 1", "stopped with no result"]);
  assert.deepEqual(v?.tail, ["last"]);
});

test("a finished green gate gives its head line only", () => {
  const snap = fixture("later");
  const v = gateView(snap.gate, snap.at);
  assert.equal(v?.state, "green");
  assert.deepEqual(v?.head, ["Gate 1", "attempt 1", "green in 2m"]);
  assert.equal(v?.tail, null);
  assert.equal(v?.excerpt, null);
  assert.deepEqual(
    gateView({ red: false, minutes: null, cached: true }, null)?.head,
    ["Gate", "green", "cached"],
  );
});

test("a red gate with a malformed excerpt keeps what it can", () => {
  const v = gateView(
    {
      red: true,
      excerpt: [null, { text: 3, hit: "yes" }, { text: "x", hit: true }],
    },
    null,
  );
  assert.deepEqual(v?.excerpt, [
    { text: "", hit: false },
    { text: "x", hit: true },
  ]);
  assert.deepEqual(gateView({ red: true, excerpt: null }, null)?.excerpt, []);
});

test("no gate draws nothing", () => {
  assert.equal(gateView(null, null), null);
  assert.equal(gateView(undefined, null), null);
});

test("red CI gives its round and excerpt", () => {
  const excerpt = [
    { text: "error[E0308]: mismatched types", hit: true },
    { text: "  --> src/cart.rs", hit: false },
  ];
  const v = ciView({
    state: "red",
    round: 2,
    head: "abc",
    checks: ["test"],
    excerpt,
  });
  assert.deepEqual(v, {
    state: "red",
    head: ["CI red", "round 2"],
    checks: [],
    excerpt,
  });
});

test("green CI gives no excerpt", () => {
  const v = ciView({
    state: "green",
    round: 1,
    checks: [],
    excerpt: [{ text: "stale", hit: true }],
  });
  assert.equal(v?.excerpt, null);
  assert.deepEqual(v?.head, ["CI green", "round 1"]);
});

test("waiting CI names its running checks", () => {
  const v = ciView(fixture("waiting-ci").ci);
  assert.deepEqual(v?.head, ["CI waiting"]);
  assert.deepEqual(v?.checks, ["lint", "test"]);
  assert.equal(v?.excerpt, null);
  assert.deepEqual(ciView({ state: "noChecks", round: null })?.head, [
    "CI no checks",
  ]);
  assert.deepEqual(ciView({ state: "rerun" })?.head, ["CI rerun"]);
});

test("CI that has not started draws nothing", () => {
  assert.equal(ciView(fixture("gate-red").ci), null);
  assert.equal(ciView(null), null);
  assert.equal(ciView({ state: "" }), null);
});

test("one info and one noise event give the info row only", () => {
  const snap = fixture("timeline-noise");
  const rows = timelineRows(snap.timeline);
  assert.deepEqual(rows, [
    {
      seq: 16,
      time: clock(Date.parse("2026-11-07T09:54:00Z")),
      label: "collect_started",
      color: "muted",
    },
  ]);
});

test("rows come newest seq first", () => {
  const snap = fixture("gate-red");
  const rows = timelineRows(snap.timeline);
  assert.deepEqual(
    rows.map((r) => r.seq),
    [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  );
  assert.equal(rows[1].label, "gate_run(2)");
  assert.equal(rows[1].color, "blocked");
});

test("each tone maps to its theme key", () => {
  assert.equal(toneKey("owner"), "blocked");
  assert.equal(toneKey("red"), "blocked");
  assert.equal(toneKey("green"), "done");
  assert.equal(toneKey("info"), "muted");
  assert.equal(toneKey("toString"), "muted");
  assert.equal(toneKey(undefined), "muted");
});

test("a row without a label or time falls back to its kind and no time", () => {
  assert.deepEqual(
    timelineRows([
      { seq: 2, kind: "pr_opened", tone: "green" },
      { seq: 1, ts: "garbage", tone: "owner" },
      { seq: "x", label: "dropped" },
    ]),
    [
      { seq: 2, time: "", label: "pr_opened", color: "done" },
      { seq: 1, time: "", label: "#1", color: "blocked" },
    ],
  );
  assert.deepEqual(timelineRows(null), []);
});
