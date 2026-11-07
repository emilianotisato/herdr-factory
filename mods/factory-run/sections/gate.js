// The gate and CI under the agents, then the run's timeline, newest first.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { ciView, gateView, timelineRows } from "../lib/gate.js";

/** @typedef {import("../lib/now.js").ExcerptLine} ExcerptLine */
/** @typedef {import("../lib/gate.js").TimelineRow} TimelineRow */

/**
 * A monospace box of log lines: hits in full color, context dimmed.
 * @param {string} id
 * @param {ExcerptLine[]} lines
 * @param {Record<string, any>} t
 * @param {string | undefined} mono
 */
function box(id, lines, t, mono) {
  return v_flex()
    .id(id)
    .mt(4)
    .px(8)
    .py(6)
    .rounded(6)
    .bg(t.chrome)
    .text_size(11.5)
    .when(Boolean(mono), (el) => el.font_family(mono))
    .children(
      lines.map((l) =>
        div()
          .whitespace_nowrap()
          .truncate()
          .text_color(l.hit ? t.foreground : t.dim)
          .child(l.text || " "),
      ),
    );
}

/**
 * @param {string[]} head
 * @param {`#${string}`} color
 * @param {Record<string, any>} t
 */
function headLine(head, color, t) {
  return h_flex()
    .gap(6)
    .items_center()
    .child(div().size(7).flex_none().rounded(4).bg(color))
    .child(
      div()
        .flex_1()
        .min_w(0)
        .truncate()
        .child(
          h_flex()
            .gap_x(6)
            .children(
              head.flatMap((p, i) => {
                const word = div()
                  .when(i === 0, (el) => el.font_medium())
                  .text_color(i === 0 ? t.foreground : t.muted)
                  .child(p);
                return i ? [div().text_color(t.dim).child("·"), word] : [word];
              }),
            ),
        ),
    );
}

/** @type {Record<string, string>} */
const STATE_COLOR = {
  running: "working",
  red: "blocked",
  green: "done",
};

/** @type {import("../lib/live.js").SectionView} */
export const view = (snap, t, ctx) => {
  const mono = ctx.cx?.theme?.()?.typography?.mono;
  const gate = gateView(snap.gate, snap.at);
  const ci = ciView(snap.ci);
  const rows = timelineRows(snap.timeline);
  if (!gate && !ci && !rows.length) return null;
  const label = (/** @type {string} */ s) =>
    div().text_size(11.5).text_color(t.muted).child(s);

  const gateEl = gate
    ? v_flex()
        .id("run-gate")
        .gap(2)
        .child(headLine(gate.head, t[STATE_COLOR[gate.state]], t))
        .when(Boolean(gate.tail?.length), (el) =>
          el.child(
            box(
              "run-gate-tail",
              (gate.tail ?? []).map((text) => ({ text, hit: true })),
              t,
              mono,
            ),
          ),
        )
        .when(Boolean(gate.excerpt?.length), (el) =>
          el.child(box("run-gate-excerpt", gate.excerpt ?? [], t, mono)),
        )
        .when(Boolean(gate.note), (el) =>
          el.child(div().pt(2).text_color(t.blocked).child(gate.note)),
        )
    : null;

  const ciColor =
    ci?.state === "red" ? t.blocked : ci?.state === "green" ? t.done : t.muted;
  const ciEl = ci
    ? v_flex()
        .id("run-ci")
        .gap(2)
        .child(headLine(ci.head, ciColor, t))
        .when(ci.checks.length > 0, (el) =>
          el.child(
            div()
              .pl(13)
              .truncate()
              .text_color(t.muted)
              .child(`running ${ci.checks.join(", ")}`),
          ),
        )
        .when(Boolean(ci.excerpt?.length), (el) =>
          el.child(box("run-ci-excerpt", ci.excerpt ?? [], t, mono)),
        )
    : null;

  const row = (/** @type {TimelineRow} */ r) =>
    h_flex()
      .id(`run-event-${r.seq}`)
      .gap(6)
      .items_center()
      .child(div().size(6).flex_none().rounded(3).bg(t[r.color]))
      .child(
        div().w(38).flex_none().text_size(11.5).text_color(t.dim).child(r.time),
      )
      .child(div().flex_1().min_w(0).truncate().child(r.label));

  return v_flex()
    .id("factory-run-gate")
    .px(14)
    .py(6)
    .gap(8)
    .when(Boolean(gateEl || ciEl), (el) =>
      el
        .child(label("Gate and CI"))
        .when(Boolean(gateEl), (el) => el.child(gateEl))
        .when(Boolean(ciEl), (el) => el.child(ciEl)),
    )
    .when(rows.length > 0, (el) =>
      el
        .child(label("Timeline"))
        .child(v_flex().id("run-timeline").gap(3).children(rows.map(row))),
    );
};
