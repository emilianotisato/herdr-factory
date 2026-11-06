// The owner's space groups, stored in `shared("space.groups")`, and the order
// the sidebar draws spaces in: loose spaces first, then each group in list order.

/**
 * @typedef {{ id: string, name: string, machine: string | null, spaces: string[] }} Group
 * @typedef {"blocked" | "done" | "working" | "idle"} Dot
 */
/**
 * A space that is not a worktree of another, with the worktree spaces drawn under it.
 * @template R
 * @typedef {{ id: string, machine: string | null, row: R, kids: R[] }} Unit
 */
/**
 * @template R
 * @typedef {{ row: R, group: string | null } | { head: Group, size: number }} Item
 */

/**
 * Whatever is stored, as a list of groups: entries without a string id are
 * dropped, and a repeated group id keeps its first entry.
 * @param {unknown} stored
 * @returns {Group[]}
 */
export function readGroups(stored) {
  if (!Array.isArray(stored)) return [];
  const seen = new Set();
  /** @type {Group[]} */
  const out = [];
  for (const entry of stored) {
    if (!entry || typeof entry !== "object") continue;
    const { id, name, machine, spaces } =
      /** @type {Record<string, unknown>} */ (entry);
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: typeof name === "string" ? name : "",
      machine: typeof machine === "string" && machine ? machine : null,
      spaces: Array.isArray(spaces)
        ? [...new Set(spaces.filter((s) => typeof s === "string"))]
        : [],
    });
  }
  return out;
}

/**
 * @param {Group[]} groups
 * @param {Set<string>} live ids of the open spaces
 * @returns {{ groups: Group[], changed: boolean }}
 */
export function prune(groups, live) {
  let changed = false;
  const out = groups.map((g) => {
    const spaces = g.spaces.filter((id) => live.has(id));
    if (spaces.length === g.spaces.length) return g;
    changed = true;
    return { ...g, spaces };
  });
  return { groups: out, changed };
}

/**
 * The drawn sequence. A space listed in two groups is in the first; one listed
 * in a group of another machine stays loose. Worktrees are never members
 * themselves: they go where their checkout goes.
 * @template R
 * @param {Unit<R>[]} units in the current order
 * @param {Group[]} groups
 * @returns {Item<R>[]}
 */
export function arrange(units, groups) {
  /** @type {Map<string, Group>} */
  const owner = new Map();
  for (const g of groups) {
    for (const id of g.spaces) if (!owner.has(id)) owner.set(id, g);
  }
  const groupOf = (/** @type {Unit<R>} */ u) => {
    const g = owner.get(u.id);
    return g && g.machine === u.machine ? g.id : null;
  };
  const tagged = units.map((u) => ({ u, group: groupOf(u) }));
  /** @type {Item<R>[]} */
  const out = [];
  const push = (
    /** @type {Unit<R>} */ u,
    /** @type {string | null} */ group,
  ) => {
    out.push({ row: u.row, group });
    for (const k of u.kids) out.push({ row: k, group });
  };
  for (const { u, group } of tagged) if (group === null) push(u, null);
  for (const g of groups) {
    const members = tagged.filter((x) => x.group === g.id);
    out.push({
      head: g,
      size: members.reduce((n, { u }) => n + 1 + u.kids.length, 0),
    });
    for (const { u } of members) push(u, g.id);
  }
  return out;
}

/** @type {Dot[]} */
const RANK = ["blocked", "done", "working", "idle"];
/** @type {Record<string, Dot>} */
const RUN = {
  owner: "blocked",
  dead: "blocked",
  failed: "blocked",
  shipped: "done",
};

/**
 * A group header's dot: the most urgent of its spaces' agent statuses and its
 * factory runs' states, or null when nothing inside reports anything.
 * @param {(string | null | undefined)[]} statuses
 * @param {string[]} runStates
 * @returns {Dot | null}
 */
export function groupDot(statuses, runStates) {
  const all = new Set([
    ...statuses,
    ...runStates.map((s) => RUN[s] ?? "working"),
  ]);
  return RANK.find((r) => all.has(r)) ?? null;
}
