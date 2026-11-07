import { test } from "node:test";
import assert from "node:assert/strict";
import { pick, readSpaceRuns } from "../mods/factory-run/lib/pick.js";

const key = {
  spaces: { shop: ["r-urgent", "r-second", "r-third"], api: ["r-api"] },
  recent: ["r-urgent", "r-second", "r-third", "r-api", "r-old"],
};

test("a missing or junk key gives no run", () => {
  for (const junk of [
    undefined,
    null,
    "x",
    3,
    [],
    { spaces: [] },
    { spaces: { shop: "r" } },
  ]) {
    assert.deepEqual(pick(junk, "shop", null), { runs: [], id: null });
  }
  assert.deepEqual(
    readSpaceRuns({ spaces: { shop: [1, "", "r", "r"] }, recent: "x" }),
    {
      spaces: { shop: ["r"] },
      recent: [],
    },
  );
});

test("a space with two runs gives the first and both as chips", () => {
  const two = { spaces: { shop: ["r1", "r2"] }, recent: ["r1", "r2"] };
  assert.deepEqual(pick(two, "shop", null), { runs: ["r1", "r2"], id: "r1" });
  assert.deepEqual(pick(key, "api", null), { runs: ["r-api"], id: "r-api" });
});

test("a chosen chip is kept while it is in the list, then the first again", () => {
  assert.equal(pick(key, "shop", "r-second").id, "r-second");
  const later = { spaces: { shop: ["r-urgent", "r-third"] }, recent: [] };
  assert.equal(pick(later, "shop", "r-second").id, "r-urgent");
});

test("a space absent from the key gives none", () => {
  assert.deepEqual(pick(key, "notes", null), { runs: [], id: null });
  assert.deepEqual(pick(key, null, null), { runs: [], id: null });
  assert.deepEqual(pick(key, "__proto__", null), { runs: [], id: null });
});
