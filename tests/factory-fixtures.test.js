import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRuns, statusOf } from "./fixtures/check-fixtures.js";

const builder = fileURLToPath(
  new URL("./fixtures/factory-fixtures.sh", import.meta.url),
);

test("factory reads one fixture run per strip state, the live ones with a live driver", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "factory-fixtures-"));
  t.after(() => {
    execFileSync(builder, ["stop", dir]);
    rmSync(dir, { recursive: true, force: true });
  });
  const wrapper = execFileSync(builder, ["build", dir], {
    encoding: "utf8",
  }).trim();

  assert.deepEqual(checkRuns(statusOf(wrapper)), []);

  execFileSync(builder, ["stop", dir]);
  const stopped = checkRuns(statusOf(wrapper));
  assert.deepEqual(
    stopped.filter((p) => p.endsWith("driverDead true, want false")).length,
    4,
    stopped.join("\n"),
  );
});

test("a second build into the same dir is refused", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "factory-fixtures-"));
  t.after(() => {
    execFileSync(builder, ["stop", dir]);
    rmSync(dir, { recursive: true, force: true });
  });
  execFileSync(builder, ["build", dir]);
  assert.throws(
    () => execFileSync(builder, ["build", dir], { stdio: "pipe" }),
    /already holds/,
  );
});
