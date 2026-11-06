import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrange,
  drop,
  groupDot,
  prune,
  readGroups,
} from "../mods/factory-spaces/lib/groups.js";

const unit = (id, kids = [], machine = null) => ({
  id,
  machine,
  row: id,
  kids,
});
const group = (id, spaces, machine = null) => ({
  id,
  name: id,
  machine,
  spaces,
});
const drawn = (items) =>
  items.map((it) => ("head" in it ? `[${it.head.id}:${it.size}]` : it.row));

test("loose spaces come first, then each group's header and members", () => {
  const items = arrange(
    [unit("a"), unit("g1"), unit("b"), unit("g2")],
    [group("acme", ["g2", "g1"])],
  );
  assert.deepEqual(drawn(items), ["a", "b", "[acme:2]", "g1", "g2"]);
  assert.deepEqual(
    items.map((it) => ("head" in it ? "head" : it.group)),
    [null, null, "head", "acme", "acme"],
  );
});

test("groups are drawn in list order, an empty one too", () => {
  const groups = [
    group("globex", ["c"]),
    group("empty", []),
    group("acme", ["a"]),
  ];
  assert.deepEqual(drawn(arrange([unit("a"), unit("b"), unit("c")], groups)), [
    "b",
    "[globex:1]",
    "c",
    "[empty:0]",
    "[acme:1]",
    "a",
  ]);
});

test("a member's worktrees follow it into the group", () => {
  const items = arrange(
    [unit("main", ["wt1", "wt2"]), unit("loose")],
    [group("acme", ["main"])],
  );
  assert.deepEqual(drawn(items), ["loose", "[acme:3]", "main", "wt1", "wt2"]);
});

test("a worktree listed on its own is not a member", () => {
  const items = arrange([unit("main", ["wt"])], [group("acme", ["wt"])]);
  assert.deepEqual(drawn(items), ["main", "wt", "[acme:0]"]);
});

test("a space listed in two groups belongs to the first", () => {
  const items = arrange(
    [unit("a")],
    [group("one", ["a"]), group("two", ["a"])],
  );
  assert.deepEqual(drawn(items), ["[one:1]", "a", "[two:0]"]);
});

test("a space on another machine than its group stays loose", () => {
  const items = arrange(
    [unit("a", [], "box"), unit("b", [], "box")],
    [group("here", ["a"]), group("there", ["b"], "box")],
  );
  assert.deepEqual(drawn(items), ["a", "[here:0]", "[there:1]", "b"]);
});

test("an arranged order arranges to itself", () => {
  const units = [unit("a"), unit("b"), unit("g1"), unit("g2")];
  const items = arrange(units, [group("acme", ["g1", "g2"])]);
  assert.deepEqual(
    drawn(items).filter((x) => !x.startsWith("[")),
    ["a", "b", "g1", "g2"],
  );
});

test("closed spaces are pruned from their groups", () => {
  const groups = [group("acme", ["a", "gone"]), group("globex", ["b"])];
  const { groups: kept, changed } = prune(
    groups,
    new Set(["a", "b"]),
    new Set([null]),
  );
  assert.equal(changed, true);
  assert.deepEqual(
    kept.map((g) => g.spaces),
    [["a"], ["b"]],
  );
  assert.equal(kept[1], groups[1]);
});

test("nothing closed changes nothing", () => {
  const groups = [group("acme", ["a"])];
  assert.deepEqual(prune(groups, new Set(["a", "b"]), new Set([null])), {
    groups,
    changed: false,
  });
});

test("a group keeps its spaces until its machine's spaces have loaded", () => {
  const groups = [group("acme", ["a"]), group("box", ["r"], "box")];
  assert.deepEqual(prune(groups, new Set(), new Set()), {
    groups,
    changed: false,
  });
  const { groups: kept } = prune(groups, new Set(), new Set(["box"]));
  assert.deepEqual(
    kept.map((g) => g.spaces),
    [["a"], []],
  );
});

test("a junk store reads as an empty list", () => {
  for (const junk of [undefined, null, "acme", 3, {}, { id: "x" }])
    assert.deepEqual(readGroups(junk), []);
  assert.deepEqual(readGroups([null, 4, "x", {}, { id: "" }, { id: 7 }]), []);
});

test("a stored list is read into valid groups", () => {
  const stored = [
    { id: "acme", name: "Acme", machine: null, spaces: ["a", 3, "b", "a"] },
    { id: "acme", name: "again", spaces: [] },
    { id: "box", name: 5, machine: "box", spaces: "a" },
    { id: "blank", name: "Blank", machine: "" },
  ];
  assert.deepEqual(readGroups(stored), [
    { id: "acme", name: "Acme", machine: null, spaces: ["a", "b"] },
    { id: "box", name: "", machine: "box", spaces: [] },
    { id: "blank", name: "Blank", machine: null, spaces: [] },
  ]);
});

test("each run state ranks as the header's dot", () => {
  const expected = {
    owner: "blocked",
    dead: "blocked",
    failed: "blocked",
    shipped: "done",
    parked: "working",
    paused: "working",
    building: "working",
  };
  for (const [state, dot] of Object.entries(expected))
    assert.equal(groupDot([], [state]), dot, state);
});

test("each agent status ranks as itself", () => {
  for (const status of ["blocked", "done", "working", "idle"])
    assert.equal(groupDot([status], []), status);
  assert.equal(groupDot([null, undefined], []), null);
});

test("the most urgent thing inside wins", () => {
  assert.equal(groupDot(["idle", "working", "done"], []), "done");
  assert.equal(groupDot(["idle", "done"], ["parked"]), "done");
  assert.equal(groupDot(["idle"], ["paused"]), "working");
  assert.equal(groupDot(["done", "working"], ["building", "owner"]), "blocked");
  assert.equal(groupDot(["blocked"], ["shipped"]), "blocked");
});

test("no status and no run give no dot", () => {
  assert.equal(groupDot([], []), null);
});

const space = (id, machine = null, worktree = false) => ({
  kind: "space",
  id,
  machine,
  worktree,
});
const head = (id) => ({ kind: "head", id });
const rowOf = (id, group = null, machine = null) => ({
  kind: "row",
  id,
  machine,
  group,
});
const dragGroup = (id) => ({ kind: "group", id });
const members = (groups) =>
  Object.fromEntries(groups.map((g) => [g.id, g.spaces]));
const order = (groups) => groups.map((g) => g.id);

test("a space dropped on a header joins that group", () => {
  const groups = [group("acme", ["g1"]), group("globex", [])];
  const next = drop(groups, space("a"), head("acme"), { from: null });
  assert.deepEqual(members(next), { acme: ["g1", "a"], globex: [] });
});

test("a space dropped on another group's header leaves its own group", () => {
  const groups = [group("acme", ["a", "b"]), group("globex", ["c"])];
  const next = drop(groups, space("a"), head("globex"), { from: "acme" });
  assert.deepEqual(members(next), { acme: ["b"], globex: ["c", "a"] });
});

test("a grouped space dropped on a loose row leaves its group", () => {
  const groups = [group("acme", ["a", "b"])];
  const next = drop(groups, space("a"), rowOf("loose"), { from: "acme" });
  assert.deepEqual(members(next), { acme: ["b"] });
});

test("a header dragged down lands below the header it is dropped on", () => {
  const groups = [group("acme", []), group("globex", []), group("initech", [])];
  const next = drop(groups, dragGroup("acme"), head("globex"), { from: null });
  assert.deepEqual(order(next), ["globex", "acme", "initech"]);
});

test("a header dragged up lands above the header it is dropped on", () => {
  const groups = [group("acme", []), group("globex", []), group("initech", [])];
  const next = drop(groups, dragGroup("initech"), head("globex"), {
    from: null,
  });
  assert.deepEqual(order(next), ["acme", "initech", "globex"]);
});

test("a space from another machine is not dropped on a group", () => {
  const groups = [group("acme", [])];
  assert.equal(
    drop(groups, space("r", "box"), head("acme"), { from: null }),
    null,
  );
});

test("a worktree is not dropped on a header on its own", () => {
  const groups = [group("acme", [])];
  assert.equal(
    drop(groups, space("wt", null, true), head("acme"), { from: null }),
    null,
  );
});

test("a header dropped on a row changes nothing", () => {
  const groups = [group("acme", ["a"]), group("globex", [])];
  assert.equal(
    drop(groups, dragGroup("globex"), rowOf("a", "acme"), { from: null }),
    null,
  );
  assert.equal(
    drop(groups, dragGroup("globex"), rowOf("b"), { from: null }),
    null,
  );
});

test("a loose space dropped on a grouped row changes nothing", () => {
  const groups = [group("acme", ["g1"])];
  assert.equal(
    drop(groups, space("a"), rowOf("g1", "acme"), { from: null }),
    null,
  );
});

test("a grouped space dropped on another group's row changes nothing", () => {
  const groups = [group("acme", ["a"]), group("globex", ["c"])];
  assert.equal(
    drop(groups, space("a"), rowOf("c", "globex"), { from: "acme" }),
    null,
  );
});

test("a drop inside one container changes no group", () => {
  const groups = [group("acme", ["a", "b"])];
  assert.equal(
    drop(groups, space("a"), rowOf("b", "acme"), { from: "acme" }),
    null,
  );
  assert.equal(drop(groups, space("x"), rowOf("y"), { from: null }), null);
});

test("a space dropped on its own group's header changes nothing", () => {
  const groups = [group("acme", ["a"])];
  assert.equal(drop(groups, space("a"), head("acme"), { from: "acme" }), null);
});

test("a header dropped on itself or another machine's header changes nothing", () => {
  const groups = [group("acme", []), group("box", [], "box")];
  assert.equal(
    drop(groups, dragGroup("acme"), head("acme"), { from: null }),
    null,
  );
  assert.equal(
    drop(groups, dragGroup("acme"), head("box"), { from: null }),
    null,
  );
});
