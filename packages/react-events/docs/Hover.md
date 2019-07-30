# Hover

The `Hover` module responds to hover events on the element it wraps. Hover
events are only dispatched for `mouse` and `pen` pointer types. Hover begins
when the pointer enters the element's bounds and ends when the pointer leaves.

Hover events do not propagate between `Hover` event responders.

```js
// Example
const Link = (props) => (
  const [ hovered, setHovered ] = useState(false);
  return (
    <Hover onHoverChange={setHovered}>
      <a
        {...props}
        href={props.href}
        style={{
          ...props.style,
          textDecoration: hovered ? 'underline': 'none'
        }}
      />
    </Hover>
  );
);
```

## Types

```js
type HoverEvent = {
  pointerType: 'mouse' | 'pen',
  target: Element,
  type: 'hoverstart' | 'hoverend' | 'hovermove' | 'hoverchange'
}
```

## Props

### disabled: boolean

Disables all `Hover` events.

### onHoverChange: boolean => void

Called when the element changes hover state (i.e., after `onHoverStart` and
`onHoverEnd`).

### onHoverEnd: (e: HoverEvent) => void

Called once the element is no longer hovered.

### onHoverMove: (e: HoverEvent) => void

Called when the pointer moves within the hit bounds of the element.

### onHoverStart: (e: HoverEvent) => void

Called once the element is hovered.

### preventDefault: boolean = true

Whether to `preventDefault()` native events.
