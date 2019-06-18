# Press

The `Press` module responds to press events on the element it wraps. Press
events are dispatched for `mouse`, `pen`, `touch`, `trackpad`, and `keyboard`
pointer types. Press events are only dispatched for keyboards when pressing the
Enter or Spacebar keys. If neither `onPress` nor `onLongPress` are called, this
signifies that the press ended outside of the element hit bounds (i.e., the user
aborted the press).

Press events do not propagate between `Press` event responders.

```js
// Example
const Button = (props) => (
  const [ pressed, setPressed ] = useState(false);
  return (
    <Press
      onPress={props.onPress}
      onPressChange={setPressed}
      onLongPress={props.onLongPress}
    >
      <div
        {...props}
        role="button"
        tabIndex={0}
        style={
          ...buttonStyles,
          ...(pressed && pressedStyles)
        }}
      />
    </Press>
  );
);
```

## Types

```js
type PressEvent = {
  pointerType: 'mouse' | 'touch' | 'pen' | 'trackpad' | 'keyboard',
  target: Element,
  type: 'press' | 'pressstart' | 'pressend' | 'presschange' | 'pressmove' | 'longpress' | 'longpresschange' | 'contextmenu'
}

type PressOffset = {
  top?: number,
  right?: number,
  bottom?: number,
  right?: number
};
```

## Props

### delayLongPress: number = 500ms

The duration of a press before `onLongPress` and `onLongPressChange` are called.

### delayPressEnd: number

The duration of the delay between when the press ends and when `onPressEnd` is
called.

### delayPressStart: number

The duration of a delay between when the press starts and when `onPressStart` is
called. This delay is cut short (and `onPressStart` is called) if the press is
released before the threshold is exceeded.

### disabled: boolean = false

Disables all `Press` events.

### disableContextMenu: boolean = false

Disables the native context menu so that it is never shown and `onContextMenu`
is never called.

### onContextMenu: (e: PressEvent) => void

Called when the context menu is shown. When a press is active, the context menu
will only be shown (and the press cancelled) if `preventDefault` is `false`.

### onLongPress: (e: PressEvent) => void

Called once the element has been pressed for the length of `delayLongPress`. If
the press point moves more than 10px `onLongPress` is cancelled.

### onLongPressChange: boolean => void

Called when the element changes long-press state.

### onLongPressShouldCancelPress: () => boolean

Determines whether calling `onPress` should be cancelled if `onLongPress` or
`onLongPressChange` have already been called. Default is `false`.

### onPress: (e: PressEvent) => void

Called immediately after a press is released, unless either 1) the press is
released outside the hit bounds of the element (accounting for
`pressRetentionOffset` and `TouchHitTarget`), or 2) the press was a long press,
and `onLongPress` or `onLongPressChange` props are provided, and
`onLongPressCancelsPress()` is `true`.

### onPressChange: boolean => void

Called when the element changes press state (i.e., after `onPressStart` and
`onPressEnd`).

### onPressEnd: (e: PressEvent) => void

Called once the element is no longer pressed (because the press was released,
cancelled, or moved beyond the hit bounds). If the press starts again before the
`delayPressEnd` threshold is exceeded then the delay is reset to prevent
`onPressEnd` being called during a press.

### onPressMove: (e: PressEvent) => void

Called when a press moves within the hit bounds of the element. `onPressMove` is
called immediately and doesn't wait for delayed `onPressStart`. Never called for
keyboard-initiated press events.  

### onPressStart: (e: PressEvent) => void

Called once the element is pressed down. If the press is released before the
`delayPressStart` threshold is exceeded then the delay is cut short and
`onPressStart` is called immediately.

### pressRetentionOffset: PressOffset

Defines how far the pointer (while held down) may move outside the bounds of the
element before it is deactivated. Once deactivated, the pointer (still held
down) can be moved back within the bounds of the element to reactivate it.
Ensure you pass in a constant to reduce memory allocations. Default is `20` for
each offset.

### preventDefault: boolean = true

Whether to `preventDefault()` native events. Native behavior is prevented by
default. If an anchor is the child of `Press`, internal and external navigation
should be performed in `onPress`/`onLongPress`. To rely on native behavior
instead, set `preventDefault` to `false`, but be aware that native behavior will
take place immediately after interaction without respect for delays or long
press.
