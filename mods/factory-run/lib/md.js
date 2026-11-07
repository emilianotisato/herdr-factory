// The small part of markdown factory writes in its free text: **bold** and
// `code` spans, ``` fenced blocks, and numbered or bulleted list lines. Anything
// else, and any marker left open, stays plain text. Never throws.

/**
 * @typedef {{ text: string, bold: boolean, code: boolean }} Run
 * @typedef {Run[]} Word runs with no space between them, kept on one line
 * @typedef {{ kind: "line", marker: string | null, words: Word[] }} LineBlock
 * @typedef {{ kind: "code", lines: string[] }} CodeBlock
 * @typedef {LineBlock | CodeBlock} MdBlock
 */

const FENCE = /^\s*```/;
const LIST = /^\s*(\d+[.)]|[-*+])\s+(.*)$/;

/**
 * One line's spans. A `**` opens bold only when another closes it on the
 * same line; a backtick opens code only when another closes it.
 * @param {string} line
 * @returns {Run[]}
 */
export function spans(line) {
  /** @type {Run[]} */
  const out = [];
  let bold = false;
  let buf = "";
  const flush = () => {
    if (buf) out.push({ text: buf, bold, code: false });
    buf = "";
  };
  for (let i = 0; i < line.length; ) {
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ text: line.slice(i + 1, end), bold, code: true });
        i = end + 1;
        continue;
      }
    } else if (
      line.startsWith("**", i) &&
      (bold || line.indexOf("**", i + 2) > i + 2)
    ) {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    buf += line[i];
    i += 1;
  }
  flush();
  return out;
}

/**
 * Spans cut at whitespace into words, so a line can wrap between them.
 * @param {Run[]} runs
 * @returns {Word[]}
 */
export function words(runs) {
  /** @type {Word[]} */
  const out = [];
  /** @type {Word} */
  let word = [];
  for (const r of runs) {
    r.text.split(/(\s+)/).forEach((piece) => {
      if (!piece) return;
      if (/^\s+$/.test(piece)) {
        if (word.length) out.push(word);
        word = [];
      } else word.push({ ...r, text: piece });
    });
  }
  if (word.length) out.push(word);
  return out;
}

/**
 * Factory's markdown as blocks to draw: one per line, one per fenced block.
 * Blank lines are dropped; a fence with no closing fence is a plain line.
 * @param {unknown} src
 * @returns {MdBlock[]}
 */
export function markdown(src) {
  if (typeof src !== "string") return [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  /** @type {MdBlock[]} */
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE.test(line)) {
      const end = lines.findIndex((l, j) => j > i && FENCE.test(l));
      if (end > i) {
        out.push({ kind: "code", lines: lines.slice(i + 1, end) });
        i = end;
        continue;
      }
    }
    if (!line.trim()) continue;
    const list = LIST.exec(line);
    out.push({
      kind: "line",
      marker: list ? (/\d/.test(list[1]) ? list[1] : "•") : null,
      words: words(spans(list ? list[2] : line.trim())),
    });
  }
  return out;
}
