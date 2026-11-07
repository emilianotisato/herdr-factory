// A run's checkpoint evidence: which images to copy into the app home, where
// `image()` can load them, and what the panel draws per checkpoint. Every path
// here comes from another program's output, so each one is checked.

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_COPIES = 24;
export const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
export const SHOTS = "data/factory-run/shots";

/**
 * @typedef {{ src: string, dst: string, tmp: string, runs: string, rel: string, root: string, file: string }} Copy
 *   `src` under `root`, which is `rel` under `runs`; `tmp` beside `dst`, renamed
 *   onto it once checked
 * @typedef {{ file: string, path: string, caption: string }} Shot
 *   `path` is relative to the app home, the form `image()` loads
 * @typedef {{ name: string, size: string }} Other
 * @typedef {{ n: number, state: string, shots: Shot[], others: Other[] }} Group
 * @typedef {{ copies: Copy[], groups: Group[] }} Plan
 */

/** @param {unknown} s */
export const component = (s) =>
  typeof s === "string" &&
  s !== "." &&
  s !== ".." &&
  /^[A-Za-z0-9._-]+$/.test(s) &&
  !s.startsWith("-");

/**
 * A path relative to its root that stays inside it, or null.
 * @param {unknown} path
 * @returns {string[] | null}
 */
export function segments(path) {
  if (typeof path !== "string" || !path || path.includes("\0")) return null;
  const parts = path.split("/");
  if (parts.some((p) => !p || p === "." || p === "..")) return null;
  return parts;
}

/**
 * Whether the resolved `path` is `root` or below it.
 * @param {string} path
 * @param {string} root
 */
export const within = (path, root) =>
  Boolean(root) &&
  root.startsWith("/") &&
  (path === root || path.startsWith(root.endsWith("/") ? root : `${root}/`));

/**
 * @param {unknown} prop the layout's `runs` prop
 * @param {string} home
 */
export const runsDir = (prop, home) =>
  (typeof prop === "string" && prop
    ? prop
    : `${home}/.local/share/factory/runs`
  ).replace(/(.)\/+$/, "$1");

/**
 * @param {string} appHome
 * @param {string} [runId]
 */
export const shotsDir = (appHome, runId) =>
  `${appHome.replace(/(.)\/+$/, "$1")}/${SHOTS}${runId ? `/${runId}` : ""}`;

/** @param {number} bytes */
export function size(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** @param {string} name */
const extOf = (name) => {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return IMAGE_EXTS.includes(ext) ? ext : null;
};

/** @param {unknown} x @returns {any[]} */
const list = (x) =>
  Array.isArray(x) ? x.filter((v) => v && typeof v === "object") : [];

/**
 * What to copy for run `runId` and what to draw. Copies skip a name already in
 * `existing`; the newest `MAX_COPIES` copyable images are the ones drawn.
 * @param {unknown} evidence the snapshot's `evidence`
 * @param {string} runs the runs folder
 * @param {string} runId
 * @param {string} appHome
 * @param {string[]} [existing] file names already in the run's shots folder
 * @returns {Plan}
 */
export function plan(evidence, runs, runId, appHome, existing = []) {
  /** @type {Plan} */
  const out = { copies: [], groups: [] };
  const ev = /** @type {any} */ (evidence);
  if (!ev || typeof ev !== "object") return out;
  const usable =
    component(runId) &&
    component(ev.root) &&
    typeof runs === "string" &&
    runs.startsWith("/") &&
    typeof appHome === "string" &&
    appHome.startsWith("/");
  const root = `${runs}/${runId}/${ev.root}`;
  const checkpoints = list(ev.checkpoints)
    .filter((c) => Number.isFinite(c.n))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.n - a.c.n || a.i - b.i)
    .map(({ c }) => c);

  /** @type {{ g: Group, file: any, parts: string[], ext: string, mtime: number }[]} */
  const candidates = [];
  for (const c of checkpoints) {
    /** @type {Group} */
    const g = {
      n: c.n,
      state: typeof c.state === "string" ? c.state : "",
      shots: [],
      others: [],
    };
    out.groups.push(g);
    for (const f of list(c.files)) {
      const parts = segments(f.path);
      if (!parts) continue;
      const name = parts[parts.length - 1];
      const bytes = Number.isFinite(f.bytes) && f.bytes >= 0 ? f.bytes : null;
      const ext = f.kind === "image" ? extOf(name) : null;
      const copyable =
        usable &&
        ext !== null &&
        bytes !== null &&
        bytes <= MAX_BYTES &&
        typeof f.etag === "string" &&
        /^\d+-\d+$/.test(f.etag);
      if (copyable && f.stable !== true) continue;
      if (!copyable) {
        g.others.push({ name, size: bytes === null ? "" : size(bytes) });
        continue;
      }
      const mtime = Date.parse(f.mtime);
      candidates.push({
        g,
        file: f,
        parts,
        ext: /** @type {string} */ (ext),
        mtime: Number.isFinite(mtime) ? mtime : 0,
      });
    }
  }

  const kept = candidates
    .map((x, i) => ({ x, i }))
    .sort((a, b) => b.x.mtime - a.x.mtime || a.i - b.i)
    .slice(0, MAX_COPIES);
  const chosen = new Set(kept.map(({ x }) => x));
  const have = new Set(existing);
  const dir = shotsDir(appHome, runId);
  for (const x of candidates) {
    const name = x.parts[x.parts.length - 1];
    if (!chosen.has(x)) {
      x.g.others.push({ name, size: size(x.file.bytes) });
      continue;
    }
    const file = `${x.file.etag}.${x.ext}`;
    x.g.shots.push({
      file,
      path: `${SHOTS}/${runId}/${file}`,
      caption:
        typeof x.file.caption === "string" && x.file.caption.trim()
          ? x.file.caption.trim()
          : name,
    });
    if (have.has(file) || out.copies.some((c) => c.file === file)) continue;
    have.add(file);
    out.copies.push({
      src: `${root}/${x.parts.join("/")}`,
      dst: `${dir}/${file}`,
      tmp: `${dir}/.${file}.part`,
      runs,
      rel: `${runId}/${ev.root}`,
      root,
      file,
    });
  }
  return out;
}

/**
 * The folders under the shots folder whose run factory no longer lists as
 * recent. Nothing while `recent` is not a list: factory has not answered yet.
 * @param {unknown} folders
 * @param {unknown} recent `shared("factory.spaceRuns")?.recent`
 * @returns {string[]}
 */
export function stale(folders, recent) {
  if (!Array.isArray(recent) || !Array.isArray(folders)) return [];
  const keep = new Set(recent.filter((r) => typeof r === "string"));
  return folders.filter((f) => component(f) && !keep.has(f));
}

/**
 * The copies in a run's shots folder that no shot of `groups` draws any more:
 * an image rewritten since, under a new etag, or one past the newest
 * `MAX_COPIES`.
 * @param {string[]} existing file names in the run's shots folder
 * @param {Group[]} groups
 * @returns {string[]}
 */
export function unused(existing, groups) {
  const drawn = new Set(groups.flatMap((g) => g.shots.map((s) => s.file)));
  return existing.filter((f) => /^\d+-\d+\.[a-z]+$/.test(f) && !drawn.has(f));
}

/**
 * Non-empty lines of a command's output.
 * @param {string} stdout
 * @returns {string[]}
 */
export const lines = (stdout) =>
  String(stdout ?? "")
    .split("\n")
    .filter(Boolean);

/**
 * Whether `stat -c '%f:%s'` (the raw mode in hex, which no locale translates)
 * describes a regular file the size of an allowed copy.
 * @param {string} stdout
 */
export function regular(stdout) {
  const m = /^([0-9a-f]+):(\d+)$/.exec(String(stdout ?? "").trim());
  if (!m) return false;
  const type = parseInt(m[1], 16) & 0o170000;
  return type === 0o100000 && Number(m[2]) <= MAX_BYTES;
}
