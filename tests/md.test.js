import { test } from "node:test";
import assert from "node:assert/strict";
import { markdown, spans } from "../mods/factory-run/lib/md.js";

const run = (text, extra = {}) => ({
  text,
  bold: false,
  code: false,
  ...extra,
});
/** A line block's words back as text, `*` around bold runs, `|` around code. */
const flat = (b) =>
  b.words
    .map((w) =>
      w
        .map((r) => (r.code ? `|${r.text}|` : r.bold ? `*${r.text}*` : r.text))
        .join(""),
    )
    .join(" ");

test("a bold label is drawn bold without its asterisks", () => {
  assert.deepEqual(spans("**Happened:** the gate was red"), [
    run("Happened:", { bold: true }),
    run(" the gate was red"),
  ]);
});

test("inline code loses its backticks and keeps punctuation beside it", () => {
  const [b] = markdown("the gate (`make gate`) was red");
  assert.equal(b.kind, "line");
  assert.equal(flat(b), "the gate (|make| |gate|) was red");
  assert.deepEqual(b.words[2], [run("("), run("make", { code: true })]);
});

test("a fenced block becomes one code block of its lines", () => {
  const blocks = markdown("ends:\n```\nnot ok 3\n  at x.js\n```\ndone");
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ["line", "code", "line"],
  );
  assert.deepEqual(blocks[1].lines, ["not ok 3", "  at x.js"]);
});

test("numbered and bulleted lines keep a marker and one line each", () => {
  const blocks = markdown(
    "**Options:**\n1. fix it by hand\n2. revert `a1b2`\n- or park it",
  );
  assert.deepEqual(
    blocks.map((b) => [b.marker, flat(b)]),
    [
      [null, "*Options:*"],
      ["1.", "fix it by hand"],
      ["2.", "revert |a1b2|"],
      ["•", "or park it"],
    ],
  );
});

test("an unterminated ** or backtick or fence stays plain text", () => {
  assert.deepEqual(spans("**Happened: the gate"), [
    run("**Happened: the gate"),
  ]);
  assert.deepEqual(spans("a `b"), [run("a `b")]);
  const blocks = markdown("```\nstill open");
  assert.deepEqual(
    blocks.map((b) => [b.kind, flat(b)]),
    [
      ["line", "```"],
      ["line", "still open"],
    ],
  );
});

test("anything that is not a string draws nothing", () => {
  for (const v of [null, undefined, 3, {}]) assert.deepEqual(markdown(v), []);
  assert.deepEqual(markdown("\n\n"), []);
});

test("factory's real block body renders without a marker character left", () => {
  const body =
    "**Happened:** the gate (`make gate`) was red 3 times. The last transcript (`gates/2-3.log`) ends:\n```\nnot ok 31 - totals\n```\n**Options:**\n1. fix it by hand\n2. revert the slice\n**Recommended:** 1 — the fix is one line.";
  const blocks = markdown(body);
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ["line", "code", "line", "line", "line", "line"],
  );
  for (const b of blocks.filter((x) => x.kind === "line"))
    for (const w of b.words)
      for (const r of w) assert.doesNotMatch(r.text, /\*\*|`/);
  assert.deepEqual(blocks[5].words[0], [run("Recommended:", { bold: true })]);
});
