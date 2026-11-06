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
 * Drops closed spaces from the groups of machines whose spaces have loaded.
 * Before that, an open space is not yet listed and would read as closed.
 * @param {Group[]} groups
 * @param {Set<string>} live ids of the open spaces
 * @param {Set<string | null>} loaded machines whose spaces are read; null is this one
 * @returns {{ groups: Group[], changed: boolean }}
 */
export function prune(groups, live, loaded) {
  let changed = false;
  const out = groups.map((g) => {
    if (!loaded.has(g.machine)) return g;
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

/**
 * @typedef {{ kind: "space", id: string, machine: string | null, worktree: boolean }
 *   | { kind: "group", id: string }} Dragged
 * @typedef {{ kind: "head", id: string }
 *   | { kind: "row", id: string, machine: string | null, group: string | null }} Target
 */

/**
 * The store after a drop, or null when the drop changes no group. A space
 * dropped on a header joins that group; a grouped space dropped on a loose row
 * leaves its group; a header dropped on a header moves that group to the side
 * it came from the other way: below when dragged down, above when dragged up.
 * A drop inside one container is a reorder, not a change of groups.
 * @param {Group[]} groups
 * @param {Dragged} dragged
 * @param {Target} target
 * @param {{ from: string | null }} facts the group the dragged space is drawn in
 * @returns {Group[] | null}
 */
export function drop(groups, dragged, target, facts) {
  if (dragged.kind === "group") {
    if (target.kind !== "head" || target.id === dragged.id) return null;
    const from = groups.findIndex((g) => g.id === dragged.id);
    const to = groups.findIndex((g) => g.id === target.id);
    if (from === -1 || to === -1) return null;
    const moving = groups[from];
    if (moving.machine !== groups[to].machine) return null;
    const rest = groups.filter((g) => g !== moving);
    const at = rest.indexOf(groups[to]) + (from < to ? 1 : 0);
    return [...rest.slice(0, at), moving, ...rest.slice(at)];
  }
  if (dragged.worktree) return null;
  const without = (/** @type {Group} */ g) =>
    g.spaces.includes(dragged.id)
      ? { ...g, spaces: g.spaces.filter((id) => id !== dragged.id) }
      : g;
  if (target.kind === "head") {
    const into = groups.find((g) => g.id === target.id);
    if (!into || into.machine !== dragged.machine || facts.from === into.id)
      return null;
    return groups.map((g) => {
      const kept = without(g);
      return g === into
        ? { ...kept, spaces: [...kept.spaces, dragged.id] }
        : kept;
    });
  }
  if (target.machine !== dragged.machine || target.group === facts.from)
    return null;
  if (facts.from === null || target.group !== null) return null;
  return groups.map(without);
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
