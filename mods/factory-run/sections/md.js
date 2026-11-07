// Factory's free text drawn from lib/md.js: each line a wrapping row of words,
// bold words bold in the foreground color, code words in the terminal's font,
// list lines with a hanging marker, and a fenced block in the excerpt's box.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { markdown } from "../lib/md.js";
import { box, mono } from "./box.js";

/** @typedef {import("../lib/md.js").Word} Word */

/** @param {Word} w @param {Record<string, any>} t */
const word = (w, t) =>
  h_flex()
    .min_w(0)
    .max_w_full()
    .children(
      w.map((r) =>
        div()
          .min_w(0)
          .when(r.bold, (el) => el.font_bold().text_color(t.foreground))
          .when(r.code, (el) => el.font_family(mono()))
          .child(r.text),
      ),
    );

/**
 * @param {string} id
 * @param {string} text
 * @param {Record<string, any>} t
 */
export function prose(id, text, t) {
  return v_flex()
    .id(id)
    .min_w(0)
    .children(
      markdown(text).map((b, i) => {
        if (b.kind === "code") {
          const lines = b.lines.map((l) => ({ text: l, hit: true }));
          return box(`${id}-code-${i}`, lines, t);
        }
        const row = h_flex()
          .flex_1()
          .min_w(0)
          .flex_wrap()
          .gap_x(4)
          .children(b.words.map((w) => word(w, t)));
        return b.marker
          ? h_flex()
              .min_w(0)
              .items_start()
              .gap_x(4)
              .child(div().flex_none().text_color(t.dim).child(b.marker))
              .child(row)
          : row;
      }),
    );
}
