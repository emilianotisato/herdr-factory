// The side panel's live view of the shown space's factory run. While the panel
// shows it, one loop at a time calls `factory live` (lib/live.js); it keeps the
// snapshot and timeline between calls, hidden too.
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, layout, props, shared, spaces, theme } from "herdr";
import { UPGRADE, apply, fresh, liveArgs, shown } from "./lib/live.js";
import { pick } from "./lib/pick.js";
import * as now from "./sections/now.js";
import * as agents from "./sections/agents.js";
import * as gate from "./sections/gate.js";
import * as shots from "./sections/shots.js";

const colors = /** @type {() => Record<string, `#${string}`>} */ (theme);
const SECTIONS = [now, agents, gate, shots];
// How often the panel looks whether a loop should start.
const WAKE_MS = 1000;
// After a failed call, and the least time between two calls.
const RETRY_MS = 10000;
const MIN_GAP_MS = 1000;

/** @typedef {import("./lib/live.js").Held} Held */
/** @typedef {import("./lib/live.js").SectionCtx} SectionCtx */

export default class RunPanel extends View {
  /** @param {unknown} _props @param {any} cx */
  init(_props, cx) {
    /** @type {Held} */
    this.held = fresh(null);
    /** @type {Record<string, string>} space -> the chip picked there */
    this.chosen = {};
    /** @type {{ id: string } | null} the loop that may call factory now */
    this.serving = null;
    cx.timer.every(WAKE_MS, (/** @type {any} */ cx) => this.wake(cx));
    this.wake(cx);
  }

  /** @returns {{ factory?: string | null, runs?: string | null }} */
  props() {
    return props() ?? {};
  }

  current() {
    const space = spaces().find((s) => s.active);
    return pick(
      shared("factory.spaceRuns"),
      space?.id,
      space ? this.chosen[space.id] : null,
    );
  }

  /**
   * @param {any} cx
   * @returns {SectionCtx}
   */
  ctx(cx) {
    const snap = this.held.snap;
    const p = this.props();
    return {
      run: {
        id: this.held.id,
        feature: typeof snap?.feature === "string" ? snap.feature : null,
        repo: typeof snap?.repo === "string" ? snap.repo : null,
      },
      factory: p.factory ?? "factory",
      runs: p.runs ?? null,
      cx,
    };
  }

  // Starts a loop for the run to show, unless one already serves it. A loop for
  // a run no longer shown stops at its next answer and draws nothing from it.
  /** @param {any} cx */
  wake(cx) {
    if (!shown(layout())) return;
    const id = this.current().id;
    if (!id || this.serving?.id === id) return;
    const me = { id };
    this.serving = me;
    if (this.held.id !== id) {
      this.held = fresh(id);
      cx.notify();
    }
    cx.spawn(async (/** @type {any} */ cx) => {
      try {
        await this.loop(me, cx);
      } finally {
        if (this.serving === me) this.serving = null;
      }
    });
  }

  /** @param {{ id: string }} me @param {any} cx */
  async loop(me, cx) {
    const live = () =>
      this.serving === me && shown(layout()) && this.current().id === me.id;
    // The first call of a loop returns at once, so a reopened panel does not
    // show what it held before it was hidden for a whole wait.
    let first = true;
    while (live()) {
      const started = Date.now();
      let result;
      try {
        result = await exec(
          this.props().factory ?? "factory",
          liveArgs(me.id, this.held.seq, !first),
        );
      } catch (e) {
        result = {
          code: -1,
          stdout: "",
          stderr: String(e instanceof Error ? e.message : e),
        };
      }
      first = false;
      if (this.serving !== me) return;
      this.held = apply(this.held, me.id, result);
      if (this.held.snap && !this.held.line) {
        shots.update(this.held.snap, this.ctx(cx));
      }
      cx.notify();
      const spent = Date.now() - started;
      if (this.held.line) await cx.sleep(RETRY_MS);
      else if (spent < MIN_GAP_MS) await cx.sleep(MIN_GAP_MS - spent);
    }
  }

  /** @param {string} id @param {any} cx */
  choose(id, cx) {
    const space = spaces().find((s) => s.active);
    if (!space) return;
    this.chosen[space.id] = id;
    cx.notify();
    this.wake(cx);
  }

  /** @param {any} cx */
  render(cx) {
    const t = colors();
    const { runs, id } = this.current();
    const published =
      shared("factory.spaceRuns") != null && spaces().some((s) => s.active);
    const root = v_flex()
      .id("factory-run")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_size(12.5)
      .text_color(t.foreground);
    if (!id) {
      return root.child(
        div()
          .p(14)
          .text_color(t.dim)
          .child(published ? "No factory run in this space." : "Loading…"),
      );
    }
    const held = this.held.id === id ? this.held : fresh(id);
    const snap = held.snap;
    const feature = typeof snap?.feature === "string" ? snap.feature : null;
    const header = h_flex()
      .px(14)
      .pt(12)
      .pb(6)
      .gap(6)
      .items_center()
      .flex_none()
      .when(Boolean(feature), (el) =>
        el.child(div().flex_none().font_medium().child(feature)),
      )
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_color(t.muted)
          .child(`run ${id}`),
      );
    const chip = (/** @type {string} */ run) => {
      const on = run === id;
      return div()
        .id(`run-chip-${run}`)
        .h(22)
        .px(8)
        .flex()
        .items_center()
        .rounded(6)
        .text_size(11.5)
        .bg(on ? t.selected : t.chrome)
        .text_color(on ? t.foreground : t.muted)
        .hover((s) => s.bg(t.hover))
        .on_click((/** @type {unknown} */ _e, /** @type {any} */ cx) =>
          this.choose(run, cx),
        )
        .child(run);
    };
    const line = held.line;
    const status =
      line?.kind === "upgrade"
        ? div().px(14).py(6).text_color(t.blocked).child(UPGRADE)
        : line?.kind === "error"
          ? div().px(14).py(4).truncate().text_color(t.dim).child(line.text)
          : !snap
            ? div().px(14).py(6).text_color(t.dim).child("Loading…")
            : null;
    const ctx = this.ctx(cx);
    const sections =
      snap && line?.kind !== "upgrade"
        ? SECTIONS.map((s) => s.view(snap, t, ctx)).filter(Boolean)
        : [];
    return root
      .child(header)
      .when(runs.length > 1, (el) =>
        el.child(
          h_flex()
            .px(14)
            .pb(6)
            .gap(4)
            .flex_wrap()
            .flex_none()
            .children(runs.map(chip)),
        ),
      )
      .when(Boolean(status), (el) => el.child(status))
      .child(
        v_flex()
          .id("factory-run-sections")
          .flex_1()
          .min_h(0)
          .overflow_y_scrollbar()
          .children(sections),
      );
  }
}
