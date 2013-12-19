---
id: events
title: Event System
layout: docs
permalink: events.html
prev: tags-and-attributes.html
next: dom-differences.html
---

## SyntheticEvent

Your event handlers will be passed instances of `SyntheticEvent`, a cross-browser wrapper around the browser's native event. It has the same interface as the browser's native event, including `stopPropagation()` and `preventDefault()`, except the events work identically across all browsers.

If you find that you need the underlying browser event for some reason, simply use the `nativeEvent` attribute to get it. Every `SyntheticEvent` object has the following attributes:

```javascript
boolean bubbles
boolean cancelable
DOMEventTarget currentTarget
boolean defaultPrevented
Number eventPhase
boolean isTrusted
DOMEvent nativeEvent
void preventDefault()
void stopPropagation()
DOMEventTarget target
Date timeStamp
String type
```


## Supported Events

React normalizes events so that they have consistent properties across
different browsers.


### Clipboard Events

Event names:

```
onCopy onCut onPaste
```

Properties:

```javascript
DOMDataTransfer clipboardData
```


### Keyboard Events

Event names:

```
onKeyDown onKeyPress onKeyUp
```

Properties:

```javascript
boolean altKey
String char
boolean ctrlKey
String key
String locale
Number location
boolean metaKey
boolean repeat
boolean shiftKey
```


### Focus Events

Event names:

```
onFocus onBlur
```

Properties:

```javascript
DOMEventTarget relatedTarget
```


### Form Events

Event names:

```
onChange onInput onSubmit
```

For more information about the onChange event, see [Forms](/react/docs/forms.html).


### Mouse Events

Event names:

```
onClick onDoubleClick onDrag onDragEnd onDragEnter onDragExit onDragLeave
onDragOver onDragStart onDrop onMouseDown onMouseEnter onMouseLeave
onMouseMove onMouseUp
```

Properties: 

```javascript
boolean altKey
Number button
Number buttons
Number clientX
Number clientY
boolean ctrlKey
boolean metaKey
Number pageX
Number pageY
DOMEventTarget relatedTarget
Number screenX
Number screenY
boolean shiftKey
```


### Touch events

To enable touch events, call `React.initializeTouchEvents(true)` before
rendering any component.

Event names:

```
onTouchCancel onTouchEnd onTouchMove onTouchStart
```

Properties:

```javascript
boolean altKey
DOMTouchList changedTouches
boolean ctrlKey
boolean metaKey
boolean shiftKey
DOMTouchList targetTouches
DOMTouchList touches
```


### UI Events

Event names:

```
onScroll
```

Properties:

```javascript
Number detail
DOMAbstractView view
```


### Wheel Events

Event names:

```
onWheel
```

Properties:

```javascript
Number deltaX
Number deltaMode
Number deltaY
Number deltaZ
```
