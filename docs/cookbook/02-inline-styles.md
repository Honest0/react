---
id: inline-styles
title: Inline Styles
layout: cookbook
permalink: inline-styles.html
next: if-else-in-JSX.html
prev: introduction.html
---

### Problem
You want to apply inline style to an element.

### Solution
Instead of writing a string, create an object whose key is the camelCased version of the style name, and whose value is the style's value, in string:

```js
/** @jsx React.DOM */

var divStyle = {
  color: 'white',
  backgroundImage: 'url(' + imgUrl + ')',
  WebkitTransition: 'all' // note the capital 'W' here
};

React.renderComponent(<div style={divStyle}>Hello World!</div>, mountNode);
```

### Discussion
Style keys are camelCased in order to be consistent with accessing the properties using `node.style.___` in DOM. This also explains why `WebkitTransition` has an uppercase "W".
