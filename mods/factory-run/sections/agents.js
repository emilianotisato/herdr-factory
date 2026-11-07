import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { workerRows } from "../lib/agents.js";

/** @type {import("../lib/live.js").SectionView} */
export const view = (snap, t) => {
  const rows = workerRows(snap.workers, snap.at);
  if (!rows.length) return null;
  const row = (
    /** @type {import("../lib/agents.js").WorkerRow} */ r,
    /** @type {number} */ i,
  ) => {
    const times = [r.running, r.lastWrite].filter(Boolean).join(" · ");
    return v_flex()
      .id(`agent-${i}`)
      .gap(2)
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .child(
            div()
              .size(7)
              .flex_none()
              .rounded(4)
              .bg(r.alive ? t.working : t.muted),
          )
          .child(
            div()
              .flex_none()
              .font_medium()
              .child(r.who ?? ""),
          )
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .text_color(t.foreground)
              .child(r.doing ?? ""),
          ),
      )
      .when(Boolean(r.narration), (el) =>
        el.child(div().pl(13).text_color(t.dim).child(r.narration)),
      )
      .when(Boolean(times), (el) =>
        el.child(div().pl(13).text_size(11.5).text_color(t.muted).child(times)),
      );
  };
  return v_flex()
    .id("factory-run-agents")
    .px(14)
    .py(6)
    .gap(8)
    .child(div().text_size(11.5).text_color(t.muted).child("Agents"))
    .children(rows.map(row));
};
