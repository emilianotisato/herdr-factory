// The run's checkpoint screenshots. `image()` loads only paths under the app
// home, so each answer copies new stable images there first, once per etag,
// and drops the copies of runs factory no longer lists as recent.
import { div, image } from "gpui-kit";
import { v_flex } from "gpui-base";
import { appHome, exec, home, shared } from "herdr";
import {
  lines,
  plan,
  regular,
  runsDir,
  shotsDir,
  stale,
  unused,
  within,
} from "../lib/shots.js";

/** @typedef {import("../lib/live.js").Snapshot} Snapshot */
/** @typedef {import("../lib/live.js").SectionCtx} SectionCtx */
/** @typedef {import("../lib/shots.js").Copy} Copy */

/** @type {Map<string, Set<string>>} run -> its copied file names */
const copied = new Map();
/** @type {{ snap: Snapshot, ctx: SectionCtx } | null} the answer to copy for next */
let next = null;
let copying = false;

/** @param {string} cmd @param {string[]} args */
const run = async (cmd, args) => {
  try {
    return await exec(cmd, args);
  } catch {
    return { code: -1, stdout: "", stderr: "" };
  }
};

/** @param {string} dir @param {"f" | "d"} type */
const names = async (dir, type) => {
  const r = await run("find", [
    dir,
    "-mindepth",
    "1",
    "-maxdepth",
    "1",
    "-type",
    type,
    "-printf",
    "%f\\n",
  ]);
  return r.code === 0 ? lines(r.stdout) : [];
};

/** @param {string} path */
const isRegular = async (path) => {
  const st = await run("stat", ["-c", "%f:%s", "--", path]);
  return st.code === 0 && regular(st.stdout);
};

/**
 * Copies one file through a temporary name beside its target, and keeps it
 * only when the evidence folder resolves to its own place under the runs
 * folder, the file's folder resolves inside it, and both the source and the
 * copy are regular files within the size cap.
 * @param {Copy} c
 */
async function copy(c) {
  const parent = c.src.slice(0, c.src.lastIndexOf("/"));
  const real = await run("realpath", ["-e", "--", c.runs, c.root, parent]);
  const [runs, root, dir] = lines(real.stdout);
  if (real.code !== 0 || !runs || !root || !dir) return false;
  if (root !== `${runs}/${c.rel}` || !within(dir, root)) return false;
  if (!(await isRegular(c.src))) return false;
  await run("rm", ["-f", "--", c.tmp]);
  const cp = await run("cp", ["-P", "--", c.src, c.tmp]);
  if (cp.code === 0 && (await isRegular(c.tmp))) {
    const mv = await run("mv", ["-f", "-T", "--", c.tmp, c.dst]);
    if (mv.code === 0) return true;
  }
  await run("rm", ["-f", "--", c.tmp]);
  return false;
}

/** @param {Snapshot} snap @param {SectionCtx} ctx @param {any} cx */
async function pass(snap, ctx, cx) {
  const app = appHome();
  const id = snap.id;
  const dir = shotsDir(app, id);
  const have = new Set(await names(dir, "f"));
  copied.set(id, have);
  cx.notify();
  const { copies, groups } = plan(
    snap.evidence,
    runsDir(ctx.runs, home()),
    id,
    app,
    [...have],
  );
  if (snap.evidence && typeof snap.evidence === "object") {
    for (const file of unused([...have], groups)) {
      have.delete(file);
      await run("rm", ["-f", "--", `${dir}/${file}`]);
    }
  }
  if (copies.length) await run("mkdir", ["-p", "--", dir]);
  for (const c of copies) {
    if (await copy(c)) {
      have.add(c.file);
      cx.notify();
    }
  }
  const recent = /** @type {any} */ (shared("factory.spaceRuns"))?.recent;
  const root = shotsDir(app);
  for (const gone of stale(await names(root, "d"), recent)) {
    await run("rm", ["-rf", "--", `${root}/${gone}`]);
    copied.delete(gone);
  }
}

/** @type {import("../lib/live.js").SectionUpdate} */
export const update = (snap, ctx) => {
  next = { snap, ctx };
  if (copying) return;
  copying = true;
  ctx.cx.spawn(async (/** @type {any} */ cx) => {
    try {
      while (next) {
        const job = next;
        next = null;
        try {
          await pass(job.snap, job.ctx, cx);
        } catch {
          // A failed pass leaves what it copied; the next answer tries again.
        }
      }
    } finally {
      copying = false;
      cx.notify();
    }
  });
};

/** @type {import("../lib/live.js").SectionView} */
export const view = (snap, t, ctx) => {
  const have = copied.get(snap.id) ?? new Set();
  const groups = plan(
    snap.evidence,
    runsDir(ctx.runs, home()),
    snap.id,
    appHome(),
  )
    .groups.map((g) => ({
      ...g,
      shots: g.shots.filter((s) => have.has(s.file)),
    }))
    .filter((g) => g.shots.length || g.others.length);
  if (!groups.length) return null;
  const group = (
    /** @type {import("../lib/shots.js").Group} */ g,
    /** @type {number} */ i,
  ) =>
    v_flex()
      .id(`shots-checkpoint-${i}`)
      .gap(6)
      .child(
        div()
          .text_size(11.5)
          .text_color(t.muted)
          .child(
            `Checkpoint ${g.n}${g.state === "writing" ? " · writing" : ""}`,
          ),
      )
      .children(
        g.shots.map((s) =>
          v_flex()
            .gap(3)
            .child(image(s.path).w_full().rounded(4))
            .child(div().text_color(t.dim).child(s.caption)),
        ),
      )
      .children(
        g.others.map((o) =>
          div()
            .truncate()
            .text_color(t.dim)
            .child(o.size ? `${o.name} · ${o.size}` : o.name),
        ),
      );
  return v_flex()
    .id("factory-run-shots")
    .px(14)
    .py(6)
    .gap(12)
    .child(div().text_size(11.5).text_color(t.muted).child("Screenshots"))
    .children(groups.map(group));
};
