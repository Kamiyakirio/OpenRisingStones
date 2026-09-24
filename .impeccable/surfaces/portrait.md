# Portrait Editor Surface

## Mode and Purpose

**Mode: Operate.** This surface is an external control desk for the game's native portrait editor. It exists to make precise animation-frame and lighting adjustments easier to scan and operate while the game remains the visual source of truth.

This surface extends the established OpenRisingStones design system. It inherits the global tokens, typography, materials, control language, and brand identity defined by `DESIGN.md`; it does not introduce or redefine global tokens.

## Authority and Workflow

- Controls may read and update the active pose time, playback state, and lighting state of the currently open native portrait editor.
- The game-native preview is the authoritative rendering of every adjustment.
- Saving remains an explicit action in the game-native interface.
- The web surface must communicate connection, synchronization, failure, and unsaved-change state without implying that it owns the final preview or save action.
- Do not add a simulated portrait preview, a duplicate save action, or other recreated game UI.

## Composition

The connected workspace is organized as a compact status and action bar, one horizontal animation timeline, and two sibling lighting panels:

- **Animation timeline:** frame stepping, scrubbing, and play/pause for the active pose.

- **Ambient Light:** color and brightness controls for fill light.
- **Directional Light:** color, brightness, horizontal angle, vertical angle, and the directional-light compass.

Treat the two panels as semantic peers even though their content differs. Their headers, reset actions, color controls, brightness controls, borders, and internal rhythm should share the same visual grammar. The directional panel may occupy more horizontal space because its angle controls and compass have greater intrinsic width; that difference must not turn it into a dominant hero surface.

## Layout and Responsiveness

- On desktop, use a two-column grid whose tracks respect the panels' intrinsic content. Give the directional panel the wider track needed by its compass and angle controls rather than forcing equal-width cards.
- Panels align to the start and size to their own content. Avoid stretching the shorter ambient panel to match the directional panel's height.
- At compact widths, collapse the lighting panels into one column while preserving their ambient-then-directional reading order.
- Within the directional panel, keep the compass beside the angle controls when space permits, then stack the compass above the controls on narrower layouts.
- Controls may reflow for legibility, but labels, current values, and adjustment inputs must remain visibly associated.

## Surface Signature

The directional-light compass is the one surface-specific signature. It translates horizontal and vertical light angles into an immediate orientation cue while the paired sliders retain precise control.

- Keep the compass instrument-like and subordinate to the task: circular boundary, restrained axes, a clear front marker, and a light-colored direction ray.
- Bind its ray color to the selected directional-light color so the cue reflects the active lighting state.
- Treat it as supplemental visualization, not a replacement for labeled angle controls or game-native preview.
- Do not generalize the compass into a global component or repeat its visual motif elsewhere without a matching directional-light task.

## Durable Guardrails

- **Do** preserve an efficient control-desk hierarchy: state first, timeline second, sibling lighting controls third, native-save reminder last.
- **Do** place the timeline before lighting so pose selection precedes scene lighting in the editing flow.
- **Do** reuse the established global tokens and shared control behavior.
- **Do** keep native preview and native save authority explicit in guidance and status copy.
- **Don't** introduce decorative lighting effects, large preview imagery, or game-interface chrome that competes with the controls.
- **Don't** promote panel-specific layout ratios, the compass, or portrait workflow language into the global design system.
