---
id: style-prop-value-px
title: Shorthand for specifying pixel values in style prop
layout: docs
permalink: style-prop-value-px.html
---

### Problem
It's tedious to specify an inline `style` value by appending your number value with the string "px" each time.

### Solution
React actually automatically appends the string "px" for you after your number, so this works:

```js
/** @jsx React.DOM */

var divStyle = {height: 10}; // rendered as "height:10px"
React.renderComponent(<div style={divStyle}>Hello World!</div>, mountNode);
```

### Discussion
See [Inline Styles](inline-styles.html) in React for more info.

Sometimes you _do_ want to keep the CSS properties unitless. Here's a list of properties that won't get the automatic "px" suffix:

- fillOpacity
- fontWeight
- opacity
- orphans
- zIndex
- zoom
