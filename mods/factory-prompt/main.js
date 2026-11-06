// Names a space group: makes one, or renames or deletes the one it was opened
// with. It writes `shared("space.groups")` itself. Enter saves, Esc cancels.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, theme, shared, setShared } from "herdr";
import { groupName, make, remove, rename } from "./lib/edit.js";

const colors = /** @type {() => Record<string, `#${string}`>} */ (theme);

/**
 * @typedef {{ overlay: string, group?: { id: string, name: string } }} Props
 */

export default class GroupPrompt extends View {
  /** @param {unknown} _props @param {any} cx */
  init(_props, cx) {
    /** @type {string} */
    this.text = this.props().group?.name ?? "";
    this.input = InputState.new({ value: this.text });
    if (this.text)
      this.input.set_selected_range({ start: 0, end: this.text.length });
    this.input.on(
      "change",
      (/** @type {unknown} */ _e, /** @type {any} */ cx) => {
        this.text = this.input.value();
        cx.notify();
      },
    );
    this.input.on("submit", () => this.save());
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

  save() {
    const p = this.props();
    if (groupName(this.text) === null) return;
    const groups = shared("space.groups");
    setShared(
      "space.groups",
      p.group ? rename(groups, p.group.id, this.text) : make(groups, this.text),
    );
    closeOverlay(p.overlay);
  }

  delete() {
    const p = this.props();
    if (!p.group) return;
    setShared("space.groups", remove(shared("space.groups"), p.group.id));
    closeOverlay(p.overlay);
  }

  /** @param {any} e @param {any} cx */
  key(e, cx) {
    if (e.key === "escape") {
      closeOverlay(this.props().overlay);
      cx.stop_propagation();
    }
  }

  render() {
    const t = colors();
    const p = this.props();
    const ready = groupName(this.text) !== null;
    const button = (
      /** @type {string} */ id,
      /** @type {string} */ text,
      /** @type {"primary" | "plain" | "danger"} */ look,
      /** @type {boolean} */ enabled,
      /** @type {() => void} */ action,
    ) =>
      h_flex()
        .id(id)
        .h(32)
        .px(14)
        .items_center()
        .rounded(8)
        .border_1()
        .border_color(look === "primary" ? t.solid : t.input)
        .bg(look === "primary" ? t.solid : t.raised)
        .text_color(
          look === "primary"
            ? t.solid_foreground
            : look === "danger"
              ? t.blocked
              : t.foreground,
        )
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
      .id("factory-prompt")
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
          .child(
            div()
              .flex_1()
              .text_size(15)
              .font_semibold()
              .child(p.group ? "Rename group" : "New group"),
          )
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
      .child(div().pt(16).pb(7).text_size(11.5).text_color(t.dim).child("Name"))
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
      .child(
        h_flex()
          .pt(20)
          .gap(8)
          .items_center()
          .when(Boolean(p.group), (el) =>
            el.child(
              button("fp-delete", "Delete", "danger", true, () =>
                this.delete(),
              ),
            ),
          )
          .child(div().flex_1())
          .child(
            button("fp-cancel", "Cancel", "plain", true, () =>
              closeOverlay(p.overlay),
            ),
          )
          .child(
            button("fp-save", "Save", "primary", ready, () => this.save()),
          ),
      );
  }
}
