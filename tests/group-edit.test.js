import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupName,
  make,
  remove,
  rename,
} from "../mods/factory-prompt/lib/edit.js";
import { arrange, readGroups } from "../mods/factory-spaces/lib/groups.js";

const group = (id, spaces, machine = null) => ({
  id,
  name: id,
  machine,
  spaces,
});

test("a made group is last, empty, on this machine, with an id no other group has", () => {
  const before = [group("g1", ["a"]), group("g2", [])];
  const after = make(before, "  acme ", 1);
  assert.equal(after.length, 3);
  assert.deepEqual(after.slice(0, 2), before);
  const made = after[2];
  assert.equal(made.name, "acme");
  assert.equal(made.machine, null);
  assert.deepEqual(made.spaces, []);
  assert.ok(!before.some((g) => g.id === made.id));
  assert.deepEqual(readGroups(after), after);
});

test("making a group twice in the same instant gives two ids", () => {
  const once = make(undefined, "acme", 42);
  const twice = make(once, "acme", 42);
  assert.equal(twice.length, 2);
  assert.notEqual(twice[0].id, twice[1].id);
});

test("rename changes only that group's name", () => {
  const before = [group("g1", ["a"]), group("g2", ["b"], "box")];
  assert.deepEqual(rename(before, "g2", " Initech "), [
    group("g1", ["a"]),
    { id: "g2", name: "Initech", machine: "box", spaces: ["b"] },
  ]);
  assert.deepEqual(rename(before, "nope", "Initech"), before);
});

test("remove drops the group and keeps the others, in order", () => {
  const before = [group("g1", ["a"]), group("g2", ["b"]), group("g3", [])];
  assert.deepEqual(remove(before, "g2"), [group("g1", ["a"]), group("g3", [])]);
  assert.deepEqual(remove(before, "nope"), before);
  assert.deepEqual(remove(null, "g1"), []);
});

test("entries it cannot read are kept as stored", () => {
  const before = [null, "junk", group("g1", [])];
  assert.deepEqual(rename(before, "g1", "acme").slice(0, 2), [null, "junk"]);
  assert.deepEqual(remove(before, "g1"), [null, "junk"]);
});

test("a removed group's spaces are drawn loose again", () => {
  const unit = (id) => ({ id, machine: null, row: id, kids: [] });
  const groups = readGroups(remove([group("acme", ["a"])], "acme"));
  const rows = arrange([unit("a"), unit("b")], groups).map((it) =>
    "row" in it ? it.row : null,
  );
  assert.deepEqual(rows, ["a", "b"]);
});

test("a blank or whitespace-only name is refused", () => {
  const before = [group("g1", [])];
  for (const blank of ["", "   ", "\t\n"]) {
    assert.equal(groupName(blank), null);
    assert.deepEqual(make(before, blank), before);
    assert.deepEqual(rename(before, "g1", blank), before);
  }
  assert.equal(groupName(" acme "), "acme");
});
