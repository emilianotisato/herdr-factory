// Making, renaming and deleting the owner's space groups in what is stored in
// `shared("space.groups")`: a list of `{ id, name, machine, spaces }` in the
// order they are drawn. Entries this does not touch are kept as they are.

/** @typedef {{ id: string, name: string, machine: string | null, spaces: string[] }} Group */

/** @param {unknown} stored @returns {unknown[]} */
const list = (stored) => (Array.isArray(stored) ? stored : []);
/** @param {unknown} entry @returns {unknown} */
const idOf = (entry) =>
  entry && typeof entry === "object"
    ? /** @type {Record<string, unknown>} */ (entry).id
    : undefined;

/**
 * A group's name as typed, or null when there is none to save.
 * @param {string} text
 * @returns {string | null}
 */
export function groupName(text) {
  const name = String(text ?? "").trim();
  return name ? name : null;
}

/**
 * A new, empty group on this machine, last. A blank name changes nothing.
 * @param {unknown} stored
 * @param {string} name
 * @param {number} [now] seeds the new id
 * @returns {unknown[]}
 */
export function make(stored, name, now = Date.now()) {
  const groups = list(stored);
  const clean = groupName(name);
  if (clean === null) return groups;
  const taken = new Set(groups.map(idOf));
  let seed = now;
  while (taken.has(`g${seed.toString(36)}`)) seed += 1;
  /** @type {Group} */
  const made = {
    id: `g${seed.toString(36)}`,
    name: clean,
    machine: null,
    spaces: [],
  };
  return [...groups, made];
}

/**
 * @param {unknown} stored
 * @param {string} id
 * @param {string} name a blank one changes nothing
 * @returns {unknown[]}
 */
export function rename(stored, id, name) {
  const groups = list(stored);
  const clean = groupName(name);
  if (clean === null) return groups;
  return groups.map((g) =>
    idOf(g) === id ? { .../** @type {object} */ (g), name: clean } : g,
  );
}

/**
 * Drops the group. Its spaces are drawn loose again and stay open.
 * @param {unknown} stored
 * @param {string} id
 * @returns {unknown[]}
 */
export function remove(stored, id) {
  return list(stored).filter((g) => idOf(g) !== id);
}
