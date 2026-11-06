// Answers one of factory's questions. Enter or Send runs factory's own answer
// command; Esc or Cancel closes without sending, and neither closes it while it sends.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, exec, notify, theme } from "herdr";
import {
  answerCall,
  canSend,
  failureLine,
  fullQuestionHint,
} from "./lib/answer.js";

const colors = /** @type {() => Record<string, `#${string}`>} */ (theme);

/**
 * @typedef {{
 *   overlay: string,
 *   run: { id: string, feature: string, repo: string },
 *   question: import("./lib/answer.js").Question,
 *   factory?: string | null,
 * }} Props
 */

export default class Answer extends View {
  /** @param {unknown} _props @param {any} cx */
  init(_props, cx) {
    this.text = "";
    /** @type {string | null} */
    this.error = null;
    this.sending = false;
    this.input = InputState.new({ value: "" });
    this.input.on(
      "change",
      (/** @type {unknown} */ _e, /** @type {any} */ cx) => {
        this.text = this.input.value();
        cx.notify();
      },
    );
    this.input.on(
      "submit",
      (/** @type {unknown} */ _e, /** @type {any} */ cx) => this.send(cx),
    );
    this.inputFocused = true;
    this.input.on(
      "focus",
      (/** @type {unknown} */ _e, /** @type {any} */ cx) => {
        this.inputFocused = true;
        cx.notify();
      },
    );
    this.input.on(
      "blur",
      (/** @type {unknown} */ _e, /** @type {any} */ cx) => {
        this.inputFocused = false;
        cx.notify();
      },
    );
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  /** @returns {Props} */
  props() {
    return props() ?? {};
  }

  /** @param {any} cx */
  send(cx) {
    const p = this.props();
    if (this.sending || !canSend(this.text)) return;
    const call = answerCall(p.question, p.factory, this.text);
    if (!call) {
      this.error = "This question carries no answer command.";
      cx.notify();
      return;
    }
    this.sending = true;
    this.error = null;
    cx.notify();
    cx.spawn(async (/** @type {any} */ cx) => {
      try {
        const r = await exec(call.command, call.args, { cwd: p.run?.repo });
        if (r.code === 0) {
          closeOverlay(p.overlay);
          notify({
            title: "Answer sent",
            body: `${p.question.id} · ${p.run?.feature ?? ""}`,
            level: "success",
          });
          return;
        }
        this.error = failureLine(r);
      } catch (e) {
        this.error = String(e instanceof Error ? e.message : e);
      }
      this.sending = false;
      cx.notify();
    });
  }

  /** @param {any} e @param {any} cx */
  key(e, cx) {
    if (e.key === "escape" && !this.sending) {
      closeOverlay(this.props().overlay);
      cx.stop_propagation();
    }
  }

  render() {
    const t = colors();
    const p = this.props();
    const ready = canSend(this.text) && !this.sending;
    const label = (/** @type {string} */ text) =>
      div().pt(16).pb(7).text_size(11.5).text_color(t.dim).child(text);
    const button = (
      /** @type {string} */ id,
      /** @type {string} */ text,
      /** @type {boolean} */ primary,
      /** @type {boolean} */ enabled,
      /** @type {(e: any, cx: any) => void} */ action,
    ) =>
      h_flex()
        .id(id)
        .h(32)
        .px(14)
        .items_center()
        .rounded(8)
        .border_1()
        .border_color(primary ? t.solid : t.input)
        .bg(primary ? t.solid : t.raised)
        .text_color(primary ? t.solid_foreground : t.foreground)
        .text_size(12.5)
        .font_medium()
        .when(!enabled, (el) => el.opacity(0.5))
        .when(enabled, (el) =>
          el
            .cursor_pointer()
            .hover((s) => s.opacity(0.88))
            .on_click(action),
        )
        .child(text);
    return v_flex()
      .id("factory-answer")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .w_full()
      .min_h(0)
      .p(18)
      .bg(t.popover)
      .text_color(t.foreground)
      .child(
        h_flex()
          .items_center()
          .gap(8)
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .text_size(15)
              .font_semibold()
              .child(`Answer ${p.question?.id ?? ""}`),
          )
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
      .child(
        div()
          .pt(2)
          .text_size(11.5)
          .text_color(t.muted)
          .child(`${p.run?.feature ?? ""} · run ${p.run?.id ?? ""}`),
      )
      .child(
        div()
          .pt(14)
          .text_size(13)
          .child(p.question?.text ?? ""),
      )
      .child(
        div()
          .pt(6)
          .text_size(11.5)
          .text_color(t.dim)
          .child(fullQuestionHint(p.run?.id ?? "")),
      )
      .child(label("Answer"))
      .child(
        Input.new(this.input)
          .h(36)
          .px(10)
          .rounded(9)
          .border_1()
          .border_color(this.inputFocused ? t.accent : t.input)
          .bg(t.background)
          .text_size(12.8)
          .text_color(t.foreground),
      )
      .when(Boolean(this.error), (el) =>
        el.child(
          div()
            .pt(6)
            .truncate()
            .text_size(11.5)
            .text_color(t.blocked)
            .child(this.error),
        ),
      )
      .child(
        h_flex()
          .pt(20)
          .gap(8)
          .justify_end()
          .child(
            button("fa-cancel", "Cancel", false, !this.sending, () =>
              closeOverlay(p.overlay),
            ),
          )
          .child(
            button(
              "fa-send",
              this.sending ? "Sending…" : "Send",
              true,
              ready,
              (_e, cx) => this.send(cx),
            ),
          ),
      );
  }
}
