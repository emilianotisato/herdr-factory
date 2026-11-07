import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const builder = here("./fixtures/factory-fixtures.sh");
const fake = here("./fixtures/fake-factory-live.sh");
const casesDir = here("./fixtures/live/");

const ENVELOPE = [
  "schema",
  "factory",
  "id",
  "feature",
  "phase",
  "repo",
  "branch",
  "seq",
  "rev",
  "at",
  "now",
  "attention",
  "workers",
  "gate",
  "ci",
  "timeline",
  "evidence",
  "decisions",
  "truncated",
];
const SECTIONS = {
  now: "waitingOn label since progress resumesAt idleSeconds driverAlive stopping",
  worker:
    "sessionId role job slice checkpoint lane spawnedAt alive doing narration running lastWriteAt outcome",
  gate: "n attempt cmd running startedAt red minutes cached log bytes tail excerpt fixEmpty",
  ci: "state round head checks excerpt",
  timeline: "seq ts kind tone label data",
  evidence: "root checkpoints skipped truncated",
  checkpoint: "n state files",
  file: "path kind bytes mtime stable etag caption citedBy sidecars",
  decisions: "count",
  attention: "id kind openedAt title body reason answer",
  reason: "source log excerpt",
  doing: "tool label at inSubagent",
  running: "tool elapsedSeconds",
  progress: "done of",
  stopping: "on what",
  excerptLine: "text hit",
  outcome: "status block",
};
const WAITING_ON =
  "owner worker gate review ci quota budget driver nothing done".split(" ");

const keys = (o) => Object.keys(o).sort();
const shape = (name, o) =>
  assert.deepEqual(keys(o), SECTIONS[name].split(" ").sort(), name);

let dir, wrapper, factory, runs, runId, otherId;

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const json = (cmd, args) =>
  JSON.parse(execFileSync(cmd, args, { encoding: "utf8" }));
const use = (id, name) =>
  execFileSync(fake, ["use", join(dir, "fake"), id, name]);
const calls = () =>
  readFileSync(join(dir, "fake", "calls.log"), "utf8")
    .split("\n")
    .filter(Boolean);
const caseFile = (name) =>
  JSON.parse(readFileSync(join(casesDir, name), "utf8"));
const caseNames = readdirSync(casesDir).filter((f) => f.endsWith(".json"));

/** Equal after dropping what changes from one second to the next. */
const steady = (o) =>
  JSON.parse(
    JSON.stringify(o, (k, v) =>
      ["at", "idleSeconds", "elapsedSeconds"].includes(k) ? undefined : v,
    ),
  );

before(() => {
  dir = mkdtempSync(join(tmpdir(), "fake-factory-live-"));
  wrapper = execFileSync(builder, ["build", join(dir, "fixtures")], {
    encoding: "utf8",
  }).trim();
  factory = execFileSync(fake, ["build", join(dir, "fake"), wrapper], {
    encoding: "utf8",
  }).trim();
  runs = join(dir, "fixtures", "data", "runs");
  const ids = json(wrapper, ["status", "--json", "--recent"]).runs.map(
    (r) => r.id,
  );
  runId = ids.find((id) => id.endsWith("-a001"));
  otherId = ids.find((id) => id.endsWith("-b003"));
});

after(() => {
  execFileSync(builder, ["stop", join(dir, "fixtures")]);
  rmSync(dir, { recursive: true, force: true });
});

test("status goes through to the wrapper unchanged", () => {
  const args = ["status", "--json", "--recent"];
  assert.deepEqual(steady(json(factory, args)), steady(json(wrapper, args)));
});

test("live of a run with no case is the wrapper's answer", () => {
  const args = ["live", otherId, "--json"];
  assert.deepEqual(steady(json(factory, args)), steady(json(wrapper, args)));
});

test("a case answers live with the run's own id, feature, repo and branch", (t) => {
  t.after(() => use(runId, "none"));
  const status = json(wrapper, ["status", "--json", "--recent"]).runs.find(
    (r) => r.id === runId,
  );
  use(runId, "block-excerpt");
  const got = json(factory, ["live", runId, "--json"]);
  const canned = caseFile("block-excerpt.json");
  assert.equal(got.id, runId);
  assert.equal(got.feature, status.feature);
  assert.equal(got.repo, status.repo);
  assert.equal(got.branch, status.branch);
  assert.deepEqual(got.attention[0].answer, [
    "factory",
    "answer",
    "--feature",
    status.feature,
    "Q1",
  ]);
  assert.deepEqual(
    got.timeline.map((e) => e.seq),
    canned.timeline.map((e) => e.seq),
  );
  assert.ok(Math.abs(Date.parse(got.at) - Date.now()) < 5000, got.at);
  assert.ok(Date.parse(got.now.since) < Date.now(), got.now.since);

  use(runId, "none");
  const args = ["live", runId, "--json"];
  assert.deepEqual(steady(json(factory, args)), steady(json(wrapper, args)));
});

test("--since keeps only the timeline rows after that seq", (t) => {
  t.after(() => use(runId, "none"));
  use(runId, "waiting-owner");
  const got = json(factory, ["live", runId, "--json", "--since", "11"]);
  assert.deepEqual(
    got.timeline.map((e) => e.seq),
    [12, 13],
  );
  assert.equal(got.seq, 13);
});

test("every call adds one line to the call log, with its time and exit code", (t) => {
  t.after(() => use(runId, "none"));
  const before = calls().length;
  run(factory, ["status", "--json"]);
  use(runId, "exit-1");
  run(factory, ["live", runId, "--json", "--since", "3"]);
  const lines = calls().slice(before);
  assert.equal(lines.length, 2, lines.join("\n"));
  assert.match(
    lines[0],
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z \d+ms exit=0 status --json$/,
  );
  assert.match(
    lines[1],
    new RegExp(`^\\S+Z \\d+ms exit=1 live ${runId} --json --since 3$`),
  );
});

test("exit-2 is factory's usage error, exit-1 is an unknown run", (t) => {
  t.after(() => use(runId, "none"));
  use(runId, "exit-2");
  const two = run(factory, ["live", runId, "--json"]);
  assert.equal(two.code, 2);
  assert.equal(two.out, "");
  assert.match(two.err, /^error: unrecognized subcommand 'live'\n/);

  use(runId, "exit-1");
  const one = run(factory, ["live", runId, "--json"]);
  assert.equal(one.code, 1);
  assert.equal(one.err, `no run ${runId}\n`);
});

test("later gains one green row 3 s after use, and --wait returns on it", async (t) => {
  t.after(() => use(runId, "none"));
  const timed = (args) => {
    const start = Date.now();
    return new Promise((resolve, reject) =>
      execFile(factory, args, (err, out) =>
        err
          ? reject(err)
          : resolve({ s: (Date.now() - start) / 1000, got: JSON.parse(out) }),
      ),
    );
  };
  const canned = caseFile("later.json");
  use(runId, "later");
  const [long, short] = await Promise.all([
    timed(["live", runId, "--json", "--wait", "10"]),
    timed(["live", runId, "--json", "--wait", "1"]),
  ]);

  assert.ok(long.s >= 2.5 && long.s <= 5, `--wait 10 took ${long.s} s`);
  assert.equal(long.got.timeline.length, canned.timeline.length + 1);
  const row = long.got.timeline.at(-1);
  assert.deepEqual(
    { seq: row.seq, kind: row.kind, tone: row.tone },
    { seq: canned.seq + 1, kind: "slice_done", tone: "green" },
  );
  assert.equal(long.got.seq, canned.seq + 1);
  assert.notEqual(long.got.rev, canned.rev);

  assert.ok(short.s >= 0.9 && short.s <= 2, `--wait 1 took ${short.s} s`);
  assert.equal(short.got.timeline.length, canned.timeline.length);
  assert.equal(short.got.rev, canned.rev);
});

test("once the later row has landed, a --wait from its seq is held", async (t) => {
  t.after(() => use(runId, "none"));
  const canned = caseFile("later.json");
  use(runId, "later");
  await sleep(3200);
  const start = Date.now();
  const got = JSON.parse(
    execFileSync(factory, [
      "live",
      runId,
      "--json",
      "--since",
      String(canned.seq + 1),
      "--wait",
      "1",
    ]),
  );
  const s = (Date.now() - start) / 1000;
  assert.ok(s >= 0.9 && s <= 2, `--wait 1 took ${s} s`);
  assert.equal(got.seq, canned.seq + 1);
  assert.deepEqual(got.timeline, []);
});

test("every case is a schema 1 answer with factory's field shapes", () => {
  const home = homedir();
  const waiting = new Set();
  for (const name of caseNames) {
    const text = readFileSync(join(casesDir, name), "utf8");
    const c = JSON.parse(text);
    assert.deepEqual(keys(c), [...ENVELOPE].sort(), name);
    assert.equal(c.schema, 1, name);
    assert.ok(
      !text.includes(home) && !/\/(home|Users)\//.test(text),
      `${name} holds a home path`,
    );
    shape("now", c.now);
    waiting.add(c.now.waitingOn);
    for (const k of ["progress", "stopping"]) if (c.now[k]) shape(k, c.now[k]);
    for (const w of c.workers) {
      shape("worker", w);
      for (const k of ["doing", "running", "outcome"]) if (w[k]) shape(k, w[k]);
    }
    shape("gate", c.gate);
    shape("ci", c.ci);
    for (const e of c.timeline) shape("timeline", e);
    assert.equal(c.seq, c.timeline.at(-1).seq, name);
    shape("evidence", c.evidence);
    for (const cp of c.evidence.checkpoints) {
      shape("checkpoint", cp);
      for (const f of cp.files) shape("file", f);
    }
    shape("decisions", c.decisions);
    const excerpts = [c.gate.excerpt, c.ci.excerpt];
    for (const a of c.attention) {
      shape("attention", a);
      shape("reason", a.reason);
      excerpts.push(a.reason.excerpt);
    }
    for (const lines of excerpts.filter(Boolean))
      for (const line of lines) shape("excerptLine", line);
  }
  assert.deepEqual([...waiting].sort(), [...WAITING_ON].sort());
});

/** Every entry under dir, as [relative path, lstat]. */
const walk = (root, rel = "") =>
  readdirSync(join(root, rel)).flatMap((name) => {
    const p = join(rel, name);
    const st = lstatSync(join(root, p));
    return st.isDirectory() ? walk(root, p) : [[p, st]];
  });

test("shots-three writes the three images it lists, at their listed sizes and etags", (t) => {
  t.after(() => use(runId, "none"));
  use(runId, "shots-three");
  const got = json(factory, ["live", runId, "--json"]);
  const files = got.evidence.checkpoints.flatMap((cp) => cp.files);
  assert.equal(files.length, 3);
  const evidence = join(runs, runId, "evidence");
  assert.equal(walk(evidence).length, 3);
  for (const f of files) {
    const st = statSync(join(evidence, f.path));
    assert.ok(st.isFile(), f.path);
    assert.equal(f.kind, "image");
    assert.equal(f.stable, true);
    assert.equal(st.size, f.bytes, f.path);
    assert.equal(f.etag, `${st.size}-${Math.floor(st.mtimeMs)}`, f.path);
    assert.equal(
      readFileSync(join(evidence, f.path)).subarray(1, 4).toString(),
      "PNG",
    );
  }
});

test("shots-hostile lists three images; evidence holds one regular PNG and one symlink", (t) => {
  t.after(() => use(runId, "none"));
  use(runId, "shots-hostile");
  const got = json(factory, ["live", runId, "--json"]);
  const files = got.evidence.checkpoints.flatMap((cp) => cp.files);
  assert.equal(files.length, 3);
  assert.ok(files.every((f) => f.kind === "image" && f.stable));
  assert.ok(files.some((f) => f.path.includes("..")));
  const evidence = join(runs, runId, "evidence");
  const entries = walk(evidence);
  assert.equal(entries.length, 2, entries.map(([p]) => p).join(", "));
  assert.equal(entries.filter(([, st]) => st.isFile()).length, 1);
  assert.equal(entries.filter(([, st]) => st.isSymbolicLink()).length, 1);
  for (const f of files) {
    const st = statSync(join(evidence, f.path));
    assert.equal(f.etag, `${st.size}-${Math.floor(st.mtimeMs)}`, f.path);
  }

  use(runId, "none");
  assert.deepEqual(readdirSync(join(runs, runId)).sort(), [
    "events.jsonl",
    "state.json",
  ]);
});
