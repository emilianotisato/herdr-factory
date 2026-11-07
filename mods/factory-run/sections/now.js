// The top of the run panel: one block per thing the run waits on from the owner,
// then the line saying what it waits on now.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { openOverlay } from "herdr";
import { attentionBlocks, nowLine } from "../lib/now.js";
import { box } from "./box.js";

/** @typedef {import("../lib/live.js").SectionCtx} SectionCtx */
/** @typedef {import("../lib/now.js").Block} Block */

/**
 * @param {Block} b
 * @param {Record<string, any>} t
 * @param {SectionCtx} ctx
 */
function answer(b, t, ctx) {
  const open = () =>
    openOverlay({
      mod: "factory-answer",
      kind: "dialog",
      modal: true,
      width: 460,
      height: 330,
      props: {
        run: ctx.run,
        question: b.question,
        factory: ctx.factory,
      },
    });
  return h_flex()
    .id(`run-answer-${b.id}`)
    .h(24)
    .px(10)
    .flex_none()
    .items_center()
    .rounded(6)
    .bg(t.solid)
    .text_color(t.solid_foreground)
    .text_size(11.5)
    .font_medium()
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .on_click(open)
    .child("Answer");
}

/**
 * @param {Block} b
 * @param {Record<string, any>} t
 * @param {SectionCtx} ctx
 */
function block(b, t, ctx) {
  const urgent = b.kind === "block" || b.kind === "ask";
  const head = h_flex()
    .gap(6)
    .items_center()
    .child(
      div()
        .flex_none()
        .text_size(11)
        .font_medium()
        .text_color(urgent ? t.blocked : t.muted)
        .child(b.kind),
    )
    .child(
      div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_size(11)
        .text_color(t.dim)
        .child(b.open ? `${b.id} · open ${b.open}` : b.id),
    )
    .when(Boolean(b.question), (el) => el.child(answer(b, t, ctx)));
  const excerpt = b.excerpt
    ? box(`run-attention-excerpt-${b.id}`, b.excerpt, t)
    : null;
  return v_flex()
    .id(`run-attention-${b.id}`)
    .mx(10)
    .mb(6)
    .p(8)
    .rounded(8)
    .border_1()
    .border_color(urgent ? t.blocked : t.border)
    .bg(t.raised)
    .child(head)
    .child(div().pt(4).font_medium().child(b.title))
    .when(Boolean(b.body), (el) =>
      el.child(div().pt(2).text_color(t.muted).child(b.body)),
    )
    .when(Boolean(excerpt), (el) => el.child(excerpt));
}

/** @type {import("../lib/live.js").SectionView} */
export const view = (snap, t, ctx) => {
  const blocks = attentionBlocks(snap.attention, snap.at);
  const parts = nowLine(snap.now, snap.decisions, snap.at);
  const line = h_flex()
    .id("run-now")
    .px(14)
    .py(6)
    .gap_x(6)
    .flex_wrap()
    .children(
      parts.flatMap((p, i) => {
        const word = div()
          .text_color(
            p.tone === "alert"
              ? t.blocked
              : p.tone === "lead"
                ? t.foreground
                : t.muted,
          )
          .when(p.tone === "lead", (el) => el.font_medium())
          .child(p.text);
        return i
          ? [
              h_flex()
                .min_w(0)
                .max_w_full()
                .items_start()
                .gap_x(6)
                .child(div().flex_none().text_color(t.dim).child("·"))
                .child(word.min_w(0)),
            ]
          : [word];
      }),
    );
  return v_flex()
    .id("run-now-section")
    .pt(4)
    .when(blocks.length > 0, (el) =>
      el
        .child(
          div()
            .px(14)
            .pb(6)
            .text_size(11.5)
            .text_color(t.muted)
            .child("Waiting on you"),
        )
        .children(blocks.map((b) => block(b, t, ctx))),
    )
    .child(line);
};
