// Which run the panel shows, from the runs the spaces sidebar publishes per space.

/**
 * @typedef {{ spaces: Record<string, string[]>, recent: string[] }} SpaceRuns
 * @typedef {{ runs: string[], id: string | null }} Pick
 */

// An id is passed to factory as an argument, so one that reads as a flag is dropped.
/** @param {unknown} list @returns {string[]} */
const ids = (list) =>
  Array.isArray(list)
    ? [
        ...new Set(
          list.filter((x) => typeof x === "string" && x && !x.startsWith("-")),
        ),
      ]
    : [];

/**
 * `shared("factory.spaceRuns")`, read without trusting its shape.
 * @param {unknown} value
 * @returns {SpaceRuns}
 */
export function readSpaceRuns(value) {
  /** @type {SpaceRuns} */
  const out = { spaces: {}, recent: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const v = /** @type {Record<string, unknown>} */ (value);
  const spaces = v.spaces;
  if (spaces && typeof spaces === "object" && !Array.isArray(spaces)) {
    for (const [space, list] of Object.entries(spaces)) {
      const runs = ids(list);
      if (runs.length) out.spaces[space] = runs;
    }
  }
  out.recent = ids(v.recent);
  return out;
}

/**
 * The runs of `space`, and the one to show: `chosen` while it is still among
 * them, else the first, which is the most urgent.
 * @param {unknown} value
 * @param {string | null | undefined} space
 * @param {string | null | undefined} chosen
 * @returns {Pick}
 */
export function pick(value, space, chosen) {
  const spaces = readSpaceRuns(value).spaces;
  const runs = space && Object.hasOwn(spaces, space) ? spaces[space] : [];
  const id = chosen && runs.includes(chosen) ? chosen : (runs[0] ?? null);
  return { runs, id };
}
