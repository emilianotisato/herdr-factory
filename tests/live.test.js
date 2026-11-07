import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY,
  TIMELINE_CAP,
  UPGRADE,
  apply,
  fresh,
  liveArgs,
  merge,
  outcome,
  shown,
} from "../mods/factory-run/lib/live.js";

const row = (seq) => ({
  seq,
  ts: "2026-11-07T00:00:00Z",
  label: `e${seq}`,
  tone: "info",
});
const rows = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => row(from + i));
const answer = (snap) => ({
  code: 0,
  stdout: JSON.stringify(snap),
  stderr: "",
});
const snapOf = (id, timeline, extra = {}) => ({
  schema: 1,
  id,
  feature: "003",
  seq: timeline.length ? timeline[timeline.length - 1].seq : 0,
  timeline,
  ...extra,
});

test("the first call asks without --since, later ones from the last seq and wait", () => {
  assert.deepEqual(liveArgs("r1", null), ["live", "r1", "--json"]);
  assert.deepEqual(liveArgs("r1", 0), [
    "live",
    "r1",
    "--json",
    "--since",
    "0",
    "--wait",
    "20",
  ]);
  const held = apply(fresh("r1"), "r1", answer(snapOf("r1", rows(1, 7))));
  assert.deepEqual(liveArgs("r1", held.seq), [
    "live",
    "r1",
    "--json",
    "--since",
    "7",
    "--wait",
    "20",
  ]);
});

test("a factory without live, or another schema, gives the upgrade line", () => {
  assert.deepEqual(
    outcome({
      code: 2,
      stdout: "",
      stderr: "error: unrecognized subcommand 'live'",
    }),
    {
      kind: "upgrade",
    },
  );
  assert.deepEqual(outcome(answer({ ...snapOf("r1", []), schema: 2 })), {
    kind: "upgrade",
  });
  assert.deepEqual(outcome({ code: 0, stdout: "not json", stderr: "" }), {
    kind: "upgrade",
  });
  assert.deepEqual(outcome(answer({ schema: 1 })), { kind: "upgrade" });
  const held = apply(fresh("r1"), "r1", { code: 2, stdout: "", stderr: "" });
  assert.deepEqual(held.line, { kind: "upgrade" });
  assert.match(UPGRADE, /schema 1 · factory upgrade/);
});

test("another failure keeps the last snapshot and shows its first stderr line", () => {
  const before = apply(fresh("x"), "x", answer(snapOf("x", rows(1, 3))));
  const after = apply(before, "x", {
    code: 1,
    stdout: "",
    stderr: "\nno run x\nmore\n",
  });
  assert.equal(after.snap, before.snap);
  assert.equal(after.seq, 3);
  assert.deepEqual(after.line, { kind: "error", text: "no run x" });
  const silent = apply(before, "x", { code: 3, stdout: "", stderr: "" });
  assert.deepEqual(silent.line, { kind: "error", text: "factory exited 3" });
  const back = apply(after, "x", answer(snapOf("x", rows(4, 4))));
  assert.equal(back.line, null);
});

test("the timeline keeps the newest 200 rows, one per seq", () => {
  const merged = merge(rows(1, 150), rows(101, 250));
  assert.equal(merged.length, TIMELINE_CAP);
  assert.equal(merged[0].seq, 51);
  assert.equal(merged[merged.length - 1].seq, 250);
  assert.equal(new Set(merged.map((r) => r.seq)).size, merged.length);

  let held = apply(fresh("r"), "r", answer(snapOf("r", rows(1, 150))));
  held = apply(held, "r", answer(snapOf("r", rows(101, 250))));
  assert.equal(held.snap.timeline.length, 200);
  assert.equal(held.snap.timeline[0].seq, 51);
  assert.equal(held.seq, 250);
});

test("an answer about another run is dropped", () => {
  const held = apply(fresh("a"), "a", answer(snapOf("a", rows(1, 2))));
  assert.equal(apply(held, "a", answer(snapOf("b", rows(1, 9)))), held);
  assert.equal(apply(held, "b", answer(snapOf("b", rows(1, 9)))), held);
  assert.equal(apply(EMPTY, "a", answer(snapOf("a", []))), EMPTY);
});

test("rows without a seq are left out, and the seq falls back to the timeline's", () => {
  const snap = {
    schema: 1,
    id: "r",
    timeline: [row(4), { label: "x" }, null, row(2)],
  };
  const held = apply(fresh("r"), "r", answer(snap));
  assert.deepEqual(
    held.snap.timeline.map((r) => r.seq),
    [2, 4],
  );
  assert.equal(held.seq, 4);
  const empty = apply(held, "r", answer({ schema: 1, id: "r" }));
  assert.equal(empty.seq, 4);
  assert.equal(empty.snap.timeline.length, 2);
});

const tree = (hidden, active) => ({
  id: "root",
  children: [
    {
      id: "work",
      children: [
        {
          id: "panel",
          hidden,
          children: [{ id: "panel-body", type: "stack", active }],
        },
      ],
    },
  ],
});

test("the panel shows the run view only when visible and on run", () => {
  assert.equal(shown(tree(false, "run")), true);
  assert.equal(shown(tree(true, "run")), false);
  assert.equal(shown(tree(false, "files")), false);
  assert.equal(shown({ id: "root", children: [] }), false);
  assert.equal(shown(null), false);
});
