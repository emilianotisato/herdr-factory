import { test } from "node:test";
import assert from "node:assert/strict";
import { duration, workerRows } from "../mods/factory-run/lib/agents.js";

const AT = "2026-11-07T15:00:00Z";

const building = {
  sessionId: "s-1",
  role: "build",
  job: null,
  slice: 4,
  checkpoint: null,
  lane: 3,
  spawnedAt: "2026-11-07T14:40:00Z",
  alive: true,
  doing: { tool: "Bash", label: "make inner", at: AT, inSubagent: false },
  narration: "Running the inner loop on the cart totals.",
  running: { tool: "Bash", elapsedSeconds: 570 },
  lastWriteAt: "2026-11-07T14:59:48Z",
  outcome: null,
};

const checking = {
  ...building,
  sessionId: "s-2",
  role: "checkpoint",
  slice: null,
  checkpoint: 1,
  job: "gateFix",
  doing: { tool: "Read", label: null, at: AT, inSubagent: true },
  running: null,
};

const silent = {
  sessionId: "s-3",
  role: "build",
  job: null,
  slice: null,
  checkpoint: null,
  lane: 1,
  spawnedAt: "2026-11-07T14:00:00Z",
  alive: false,
  doing: null,
  narration: null,
  running: null,
  lastWriteAt: null,
  outcome: "done",
};

test("running and last write read against the snapshot's time", () => {
  const [row] = workerRows([building], AT);
  assert.deepEqual(row, {
    who: "build · slice 4",
    doing: "make inner",
    narration: "Running the inner loop on the cart totals.",
    running: "running 9m 30s",
    lastWrite: "last write 12s ago",
    alive: true,
  });
});

test("a worker with every derived field null gives blanks", () => {
  assert.deepEqual(workerRows([silent], AT), [
    {
      who: "build",
      doing: null,
      narration: null,
      running: null,
      lastWrite: null,
      alive: false,
    },
  ]);
});

test("three workers give three rows in order", () => {
  const rows = workerRows([building, checking, silent], AT);
  assert.deepEqual(
    rows.map((r) => r.who),
    ["build · slice 4", "checkpoint 1 · gateFix", "build"],
  );
  assert.equal(rows[1].doing, "Read");
  assert.equal(rows[1].running, null);
});

test("junk input gives no rows and no throw", () => {
  for (const junk of [undefined, null, "x", {}]) {
    assert.deepEqual(workerRows(junk, AT), []);
  }
  assert.deepEqual(workerRows([null, 3, {}], "not a time"), [
    {
      who: null,
      doing: null,
      narration: null,
      running: null,
      lastWrite: null,
      alive: false,
    },
  ]);
  assert.equal(workerRows([building], null)[0].lastWrite, null);
});

test("durations", () => {
  assert.equal(duration(0), "0s");
  assert.equal(duration(45.9), "45s");
  assert.equal(duration(570), "9m 30s");
  assert.equal(duration(3900), "1h 5m");
  assert.equal(duration(-5), "0s");
});
