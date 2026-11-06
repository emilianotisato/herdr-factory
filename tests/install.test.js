import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");
const upstream = JSON.parse(
  fs.readFileSync(path.join(repo, "upstream.json"), "utf8"),
);
const installedPaths = ["mods/factory-spaces", "layouts/factory.json"];

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "factory-install-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const home = path.join(dir, "home");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(home);
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(home, "settings.json"), '{ "theme": "mine" }\n');
  fs.writeFileSync(path.join(home, "keys.json"), '{ "cmd-k": "mine" }\n');
  const log = path.join(dir, "herdr-app.log");
  fs.writeFileSync(
    path.join(bin, "herdr-app"),
    `#!/usr/bin/env bash
echo "$*" >> "${log}"
case "$1" in
  --version) echo "herdr-app 0.1.99" ;;
  status) exit "\${STUB_STATUS:-1}" ;;
esac
`,
    { mode: 0o755 },
  );
  const run = (args = [], env = {}) =>
    spawnSync("bash", [path.join(repo, "install.sh"), ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        HERDR_APP_HOME: home,
        PATH: `${bin}:${process.env.PATH}`,
        ...env,
      },
    });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { home, run, calls };
}

function snapshot(root) {
  const out = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      const rel = path.relative(root, p);
      if (entry.isSymbolicLink()) out[rel] = `-> ${fs.readlinkSync(p)}`;
      else if (entry.isDirectory()) {
        out[rel] = "dir";
        walk(p);
      } else out[rel] = fs.readFileSync(p, "utf8");
    }
  };
  walk(root);
  return out;
}

function assertOk(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
}

test("installs by copy twice, then by symlink, leaving personal files alone", (t) => {
  const { home, run } = scratch(t);
  const personal = () =>
    ["settings.json", "keys.json"].map((f) =>
      fs.readFileSync(path.join(home, f)),
    );
  const before = personal();

  for (let i = 0; i < 2; i++) {
    assertOk(run());
    assert.deepEqual(personal(), before);
    for (const p of installedPaths) {
      assert.ok(!fs.lstatSync(path.join(home, p)).isSymbolicLink(), p);
    }
    for (const f of [
      "mods/factory-spaces/main.js",
      "mods/factory-spaces/mod.json",
      "layouts/factory.json",
    ]) {
      assert.deepEqual(
        fs.readFileSync(path.join(home, f)),
        fs.readFileSync(path.join(repo, f)),
        f,
      );
    }
  }

  assertOk(run(["--dev"]));
  assert.deepEqual(personal(), before);
  for (const p of installedPaths) {
    const target = path.join(home, p);
    assert.ok(fs.lstatSync(target).isSymbolicLink(), p);
    assert.equal(fs.realpathSync(target), fs.realpathSync(path.join(repo, p)));
  }
});

for (const foreign of installedPaths) {
  test(`refuses a ${foreign} it did not write and writes nothing`, (t) => {
    const { home, run } = scratch(t);
    const target = path.join(home, foreign);
    if (foreign.startsWith("mods/")) {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "main.js"), "// someone else's\n");
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, "{}\n");
    }
    const before = snapshot(home);

    const result = run();

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(foreign.replace(/[.]/g, "\\.")));
    assert.deepEqual(snapshot(home), before);
  });
}

test("warns when Herdr's spaces mod moved on since the clone, and installs anyway", (t) => {
  const { home, run } = scratch(t);
  const installed = JSON.parse(JSON.stringify(upstream.installed));
  installed.spaces["main.js"] = "0000000000000000";
  fs.writeFileSync(
    path.join(home, "installed.json"),
    JSON.stringify(installed),
  );

  const result = run();

  assertOk(result);
  assert.match(result.stderr, /warning:.*spaces.*0\.1\.13.*0\.1\.99/);
  assert.equal(
    result.stderr.split("\n").filter((l) => l.startsWith("warning:")).length,
    1,
  );
  assert.ok(fs.existsSync(path.join(home, "mods/factory-spaces/main.js")));
  assert.ok(fs.existsSync(path.join(home, "layouts/factory.json")));
});

test("stays quiet when Herdr's spaces mod and main layout match the clone", (t) => {
  const { home, run } = scratch(t);
  fs.writeFileSync(
    path.join(home, "installed.json"),
    JSON.stringify(upstream.installed),
  );

  const result = run();

  assertOk(result);
  assert.doesNotMatch(result.stderr + result.stdout, /warning/);
});

test("switches a running Herdr to the factory layout", (t) => {
  const { run, calls } = scratch(t);

  assertOk(run([], { STUB_STATUS: "0" }));

  assert.match(calls(), /^do layout\.switch --name factory$/m);
});

test("tells how to pick the layout when Herdr is not running", (t) => {
  const { run, calls } = scratch(t);

  const result = run();

  assertOk(result);
  assert.match(result.stdout, /not running.*layout\.switch --name factory/);
  assert.doesNotMatch(calls(), /layout\.switch/);
});

test("a copy carries each mod whole, its lib folder too", (t) => {
  const { home, run } = scratch(t);
  assertOk(run());
  for (const f of ["lib/runs.js", "lib/alerts.js"]) {
    assert.deepEqual(
      fs.readFileSync(path.join(home, "mods/factory-spaces", f)),
      fs.readFileSync(path.join(repo, "mods/factory-spaces", f)),
    );
  }
});

test("a mod it installed that the checkout no longer has is removed", (t) => {
  const { home, run } = scratch(t);
  assertOk(run());
  const old = path.join(home, "mods/factory-retired");
  fs.mkdirSync(old);
  fs.appendFileSync(
    path.join(home, "factory-install.txt"),
    "mods/factory-retired\nmods/spaces\n",
  );
  fs.mkdirSync(path.join(home, "mods/spaces"));
  const r = run();
  assertOk(r);
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(path.join(home, "mods/spaces")), true);
  assert.equal(
    fs
      .readFileSync(path.join(home, "factory-install.txt"), "utf8")
      .includes("retired"),
    false,
  );
});
