// A box of log lines in the terminal's font: hits in full color, context dimmed.
import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { settings } from "herdr";

/** @typedef {import("../lib/now.js").ExcerptLine} ExcerptLine */

const mono = () => {
  const font = settings()?.font_family;
  return typeof font === "string" && font ? font : "JetBrains Mono";
};

/**
 * @param {string} id
 * @param {ExcerptLine[]} lines
 * @param {Record<string, any>} t
 * @param {{ wrap?: boolean }} [opts] wrap long lines instead of cutting them
 */
export function box(id, lines, t, { wrap = true } = {}) {
  return v_flex()
    .id(id)
    .mt(4)
    .px(8)
    .py(6)
    .rounded(6)
    .bg(t.chrome)
    .text_size(11.5)
    .font_family(mono())
    .children(
      lines.map((l) => {
        const line = div()
          .min_w(0)
          .text_color(l.hit ? t.foreground : t.dim)
          .child(l.text || " ");
        return wrap ? line : line.whitespace_nowrap().truncate();
      }),
    );
}
