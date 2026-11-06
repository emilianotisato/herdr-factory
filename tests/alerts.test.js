import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alerts,
  questionKey,
  storedList,
  undismissed,
} from "../mods/factory-spaces/lib/alerts.js";
import { bySpace, NONE, parseStatus } from "../mods/factory-spaces/lib/runs.js";

const status = (runs) =>
  parseStatus(JSON.stringify({ schema: 1, factory: "0.13.0", runs }));
const asking = (id, feature, ...questions) => ({
  id,
  feature,
  phase: "building",
  repo: "/src/shop",
  questions: questions.map(([qid, text]) => ({ id: qid, text })),
});
const shipped = (id, feature) => ({
  id,
  feature,
  phase: "finished",
  repo: "/src/shop",
  pr: `https://github.com/o/shop/pull/${feature}`,
});
const failed = (id, feature) => ({ ...shipped(id, feature), phase: "failed" });

test("a new question asks for one toast and one sound", () => {
  const now = status([asking("r1", "019", ["Q-1", "Which table?"])]);
  const r = alerts([], now, { r1: "space-a" });
  assert.equal(r.alerts.length, 1);
  assert.equal(r.alerts.filter((a) => a.sound === "blocked").length, 1);
  assert.deepEqual(r.alerts[0].toast, {
    title: "019 needs you",
    body: "Which table?",
    level: "warning",
    action: { name: "space.select", args: { id: "space-a" } },
  });
  assert.deepEqual(r.seen, [questionKey("r1", "Q-1")]);
});

test("a question already alerted on asks for nothing, after a restart too", () => {
  const now = status([asking("r1", "019", ["Q-1", "Which table?"])]);
  const first = alerts([], now, { r1: "space-a" });
  const again = alerts(first.seen, now, { r1: "space-a" });
  assert.deepEqual(again.alerts, []);
  assert.deepEqual(again.seen, first.seen);
  const stored = storedList(JSON.stringify(first.seen));
  assert.deepEqual(alerts(stored, now, {}).alerts, []);
});

test("the same question id in two runs alerts twice", () => {
  const now = status([
    asking("r1", "019", ["Q-1", "One?"]),
    asking("r2", "020", ["Q-1", "Two?"]),
  ]);
  const r = alerts([], now, { r1: "a", r2: "b" });
  assert.deepEqual(
    r.alerts.map((a) => [a.toast.title, a.toast.action.args.id]),
    [
      ["019 needs you", "a"],
      ["020 needs you", "b"],
    ],
  );
});

test("each new question of a run alerts once, beside ones already seen", () => {
  const now = status([asking("r1", "019", ["Q-1", "One?"], ["Q-2", "Two?"])]);
  const r = alerts([questionKey("r1", "Q-1")], now, {});
  assert.deepEqual(
    r.alerts.map((a) => a.toast.body),
    ["Two?"],
  );
  assert.deepEqual(r.seen, [
    questionKey("r1", "Q-1"),
    questionKey("r1", "Q-2"),
  ]);
});

test("a run with no space alerts with nothing to click through to", () => {
  const now = status([asking("r1", "019", ["Q-1", "One?"])]);
  const [a] = alerts([], now, {}).alerts;
  assert.equal(a.toast.action, undefined);
});

test("questions of runs no longer listed are forgotten", () => {
  const now = status([asking("r2", "020")]);
  const r = alerts(
    [questionKey("r1", "Q-1"), questionKey("r2", "Q-1"), "junk"],
    now,
    {},
  );
  assert.deepEqual(r.seen, [questionKey("r2", "Q-1")]);
});

test("without a run list nothing alerts and nothing is forgotten", () => {
  const seen = [questionKey("r1", "Q-1")];
  assert.deepEqual(alerts(seen, NONE, {}), { alerts: [], seen });
  const old = { kind: "old", version: "0.12.0" };
  assert.deepEqual(undismissed(["r1"], old), {
    status: old,
    dismissed: ["r1"],
  });
});

test("a dismissed shipped run is hidden; another on the same space shows", () => {
  const now = status([shipped("r1", "024"), shipped("r2", "025")]);
  const r = undismissed(["r1"], now);
  const lanes = bySpace(r.status, [{ id: "s", top: "/src/shop", repo: true }]);
  assert.deepEqual(
    lanes.s.strips.map((s) => s.id),
    ["r2"],
  );
  assert.deepEqual(r.dismissed, ["r1"]);
});

test("a dismissed failed run is hidden, and every strip gone leaves no lane", () => {
  const r = undismissed(["r1"], status([failed("r1", "025")]));
  assert.deepEqual(r.status.runs, []);
  assert.deepEqual(
    bySpace(r.status, [{ id: "s", top: "/src/shop", repo: true }]),
    {},
  );
});

test("a dismissed run that is live again shows, and its next result shows too", () => {
  const r = undismissed(["r1"], status([asking("r1", "019")]));
  assert.deepEqual(
    r.status.runs.map((x) => x.id),
    ["r1"],
  );
  assert.deepEqual(r.dismissed, []);
  const again = undismissed(r.dismissed, status([failed("r1", "019")]));
  assert.deepEqual(
    again.status.runs.map((x) => x.id),
    ["r1"],
  );
});

test("dismissed ids of runs no longer listed are dropped", () => {
  const r = undismissed(["r1", "gone"], status([shipped("r1", "024")]));
  assert.deepEqual(r.dismissed, ["r1"]);
});

test("a stored list that is missing or broken reads as empty", () => {
  assert.deepEqual(storedList(null), []);
  assert.deepEqual(storedList("{"), []);
  assert.deepEqual(storedList('{"a":1}'), []);
  assert.deepEqual(storedList('["a",2,"b"]'), ["a", "b"]);
});
