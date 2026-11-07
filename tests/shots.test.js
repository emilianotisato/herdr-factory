import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BYTES,
  lines,
  plan,
  regular,
  runsDir,
  segments,
  shotsDir,
  size,
  stale,
  within,
} from "../mods/factory-run/lib/shots.js";

const RUNS = "/home/me/.local/share/factory/runs";
const APP = "/home/me/.config/herdr-app";
const RUN = "003-20261107-a1b2";

/** @param {string} path @param {number} minute @param {Record<string, any>} [more] */
const image = (path, minute, more = {}) => ({
  path,
  kind: "image",
  bytes: 843,
  mtime: `2026-11-07T08:${String(minute).padStart(2, "0")}:00Z`,
  stable: true,
  etag: `843-${1794039000000 + minute * 60000}`,
  caption: `Shot ${minute}`,
  citedBy: [],
  sidecars: [],
  ...more,
});

/** @param {any[]} checkpoints @param {string} [root] */
const evidence = (checkpoints, root = "evidence") => ({
  root,
  checkpoints,
  skipped: 0,
  truncated: false,
});

test("a good entry copies from the run's evidence into the app home", () => {
  const p = plan(
    evidence([
      { n: 1, state: "done", files: [image("checkpoint-1/cart.png", 14)] },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.equal(p.copies.length, 1);
  const etag = `843-${1794039000000 + 14 * 60000}`;
  assert.deepEqual(p.copies[0], {
    src: `${RUNS}/${RUN}/evidence/checkpoint-1/cart.png`,
    dst: `${APP}/data/factory-run/shots/${RUN}/${etag}.png`,
    tmp: `${APP}/data/factory-run/shots/${RUN}/.${etag}.png.part`,
    root: `${RUNS}/${RUN}/evidence`,
    file: `${etag}.png`,
  });
  assert.deepEqual(p.groups, [
    {
      n: 1,
      state: "done",
      shots: [
        {
          file: `${etag}.png`,
          path: `data/factory-run/shots/${RUN}/${etag}.png`,
          caption: "Shot 14",
        },
      ],
      others: [],
    },
  ]);
});

test("unstable, oversized and non-image files are not copied", () => {
  const p = plan(
    evidence([
      {
        n: 1,
        state: "writing",
        files: [
          image("checkpoint-1/fresh.png", 20, { stable: false }),
          image("checkpoint-1/huge.png", 19, { bytes: MAX_BYTES + 1 }),
          image("checkpoint-1/edge.png", 18, { bytes: MAX_BYTES }),
          {
            path: "checkpoint-1/gate.txt",
            kind: "text",
            bytes: 2048,
            mtime: "2026-11-07T08:17:00Z",
            stable: true,
            etag: "2048-1",
          },
        ],
      },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.deepEqual(
    p.copies.map((c) => c.src.split("/").pop()),
    ["edge.png"],
  );
  assert.deepEqual(p.groups[0].others, [
    { name: "huge.png", size: "4.0 MB" },
    { name: "gate.txt", size: "2.0 KB" },
  ]);
  assert.equal(p.groups[0].state, "writing");
});

test("of thirty stable images only the newest 24 are copied", () => {
  const files = Array.from({ length: 30 }, (_, i) =>
    image(`checkpoint-1/s${i}.png`, i),
  ).reverse();
  const p = plan(evidence([{ n: 1, state: "done", files }]), RUNS, RUN, APP);
  assert.equal(p.copies.length, 24);
  assert.equal(p.groups[0].shots.length, 24);
  const copied = p.copies.map((c) => c.src.split("/").pop());
  assert.ok(copied.includes("s29.png"));
  assert.ok(copied.includes("s6.png"));
  assert.ok(!copied.includes("s5.png"));
  assert.equal(p.groups[0].others.length, 6);
});

test("the newest 24 are counted across checkpoints", () => {
  const older = Array.from({ length: 20 }, (_, i) =>
    image(`checkpoint-1/a${i}.png`, i),
  );
  const newer = Array.from({ length: 20 }, (_, i) =>
    image(`checkpoint-2/b${i}.png`, 30 + i),
  );
  const p = plan(
    evidence([
      { n: 1, state: "done", files: older },
      { n: 2, state: "done", files: newer },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.deepEqual(
    p.groups.map((g) => [g.n, g.shots.length]),
    [
      [2, 20],
      [1, 4],
    ],
  );
});

test("paths that leave the evidence folder are rejected", () => {
  const files = [
    image("checkpoint-1/../../escape.png", 1),
    image("/etc/passwd.png", 2),
    image("checkpoint-1//double.png", 3),
    image("./here.png", 4),
    image("checkpoint-1/ok.png", 5),
  ];
  const p = plan(evidence([{ n: 1, state: "done", files }]), RUNS, RUN, APP);
  assert.deepEqual(
    p.copies.map((c) => c.src),
    [`${RUNS}/${RUN}/evidence/checkpoint-1/ok.png`],
  );
  assert.deepEqual(p.groups[0].others, []);
});

test("a root that is not a plain relative name copies nothing", () => {
  const files = [image("checkpoint-1/ok.png", 5)];
  for (const root of [
    "/tmp/evidence",
    "../evidence",
    "a/b",
    "..",
    ".",
    "",
    null,
  ]) {
    const p = plan(
      evidence([{ n: 1, state: "done", files }], /** @type {any} */ (root)),
      RUNS,
      RUN,
      APP,
    );
    assert.deepEqual(p.copies, [], String(root));
    assert.deepEqual(p.groups[0].shots, [], String(root));
  }
});

test("a bad run id, runs folder or etag copies nothing", () => {
  const ev = evidence([{ n: 1, state: "done", files: [image("c/ok.png", 5)] }]);
  assert.deepEqual(plan(ev, RUNS, "../x", APP).copies, []);
  assert.deepEqual(plan(ev, RUNS, "-rf", APP).copies, []);
  assert.deepEqual(plan(ev, "runs", RUN, APP).copies, []);
  assert.deepEqual(plan(ev, RUNS, RUN, "home").copies, []);
  const badEtag = evidence([
    { n: 1, state: "done", files: [image("c/ok.png", 5, { etag: "../x" })] },
  ]);
  assert.deepEqual(plan(badEtag, RUNS, RUN, APP).copies, []);
});

test("checkpoints come newest first", () => {
  const p = plan(
    evidence([
      { n: 1, state: "done", files: [] },
      { n: 3, state: "writing", files: [] },
      { n: 2, state: "done", files: [] },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.deepEqual(
    p.groups.map((g) => g.n),
    [3, 2, 1],
  );
});

test("a copy already in the shots folder is not planned again", () => {
  const f = image("checkpoint-1/cart.png", 14);
  const p = plan(
    evidence([{ n: 1, state: "done", files: [f] }]),
    RUNS,
    RUN,
    APP,
    [`${f.etag}.png`],
  );
  assert.deepEqual(p.copies, []);
  assert.equal(p.groups[0].shots.length, 1);
});

test("two entries with one etag are copied once", () => {
  const f = image("checkpoint-1/cart.png", 14);
  const p = plan(
    evidence([
      { n: 1, state: "done", files: [f, { ...f, path: "checkpoint-1/b.png" }] },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.equal(p.copies.length, 1);
});

test("the extension comes from the image list, lowercased", () => {
  const p = plan(
    evidence([
      {
        n: 1,
        state: "done",
        files: [image("c/a.JPEG", 1), image("c/b.bmp", 2), image("c/noext", 3)],
      },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.deepEqual(
    p.copies.map((c) => c.file.split(".").pop()),
    ["jpeg"],
  );
  assert.deepEqual(
    p.groups[0].others.map((o) => o.name),
    ["b.bmp", "noext"],
  );
});

test("a caption falls back to the file name", () => {
  const p = plan(
    evidence([
      { n: 1, state: "done", files: [image("c/a.png", 1, { caption: " " })] },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.equal(p.groups[0].shots[0].caption, "a.png");
});

test("junk evidence plans nothing", () => {
  for (const ev of [null, "x", {}, { root: "evidence", checkpoints: "x" }]) {
    assert.deepEqual(plan(ev, RUNS, RUN, APP), { copies: [], groups: [] });
  }
  const p = plan(
    evidence([
      { n: "x" },
      { n: 1, files: [null, { path: 3 }, { path: "a.txt" }] },
    ]),
    RUNS,
    RUN,
    APP,
  );
  assert.deepEqual(p.groups, [
    { n: 1, state: "", shots: [], others: [{ name: "a.txt", size: "" }] },
  ]);
});

test("folders not in recent are stale, ones in it are not", () => {
  assert.deepEqual(stale(["a", "b", "c"], ["b", 4]), ["a", "c"]);
  assert.deepEqual(stale(["a"], []), ["a"]);
});

test("a missing or junk recent removes nothing", () => {
  assert.deepEqual(stale(["a"], undefined), []);
  assert.deepEqual(stale(["a"], null), []);
  assert.deepEqual(stale(["a"], "a"), []);
  assert.deepEqual(stale(["a"], { a: 1 }), []);
  assert.deepEqual(stale("a", []), []);
});

test("a name that is not one path component is never stale", () => {
  assert.deepEqual(stale(["..", ".", "a/b", "", "-x", "ok"], []), ["ok"]);
});

test("segments accepts only a plain relative path", () => {
  assert.deepEqual(segments("a/b.png"), ["a", "b.png"]);
  for (const p of ["", "/a", "a/", "a/../b", "./a", "a\0b", 7]) {
    assert.equal(segments(p), null, String(p));
  }
});

test("within holds a path to its root", () => {
  assert.ok(within("/r/ev/a", "/r/ev"));
  assert.ok(within("/r/ev", "/r/ev"));
  assert.ok(within("/r/ev/a", "/r/ev/"));
  assert.ok(!within("/r/evil/a", "/r/ev"));
  assert.ok(!within("/r/a", ""));
  assert.ok(!within("/r/a", "r"));
});

test("the runs folder defaults under home and loses a trailing slash", () => {
  assert.equal(runsDir(null, "/home/me"), RUNS);
  assert.equal(runsDir("/tmp/runs//", "/home/me"), "/tmp/runs");
  assert.equal(runsDir("/", "/home/me"), "/");
  assert.equal(shotsDir(`${APP}/`), `${APP}/data/factory-run/shots`);
  assert.equal(shotsDir(APP, RUN), `${APP}/data/factory-run/shots/${RUN}`);
});

test("sizes read in bytes, kilobytes and megabytes", () => {
  assert.equal(size(843), "843 B");
  assert.equal(size(1536), "1.5 KB");
  assert.equal(size(3 * 1024 * 1024), "3.0 MB");
});

test("only a regular file within the size cap is kept", () => {
  assert.ok(regular("regular file:843\n"));
  assert.ok(!regular("symbolic link:30"));
  assert.ok(!regular("regular empty file:0"));
  assert.ok(!regular(`regular file:${MAX_BYTES + 1}`));
  assert.deepEqual(lines("a\n\nb\n"), ["a", "b"]);
});
