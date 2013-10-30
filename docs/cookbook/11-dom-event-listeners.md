---
id: dom-event-listeners
title: DOM event listeners in a component
layout: cookbook
permalink: dom-event-listeners.html
prev: props-in-getInitialSate-as-anti-pattern.html
next: initial-ajax.html
---

> Note:
>
> This entry shows how to attach DOM events not provided by React ([check here for more info](/react/docs/cookbook/events.html)). This is good for integrations with other libraries such as jQuery.

Try to resize the window:

```js
/** @jsx React.DOM */

var Box = React.createClass({
  getInitialState: function() {
    return {windowWidth: window.innerWidth};
  },
  handleResize: function(e) {
    this.setState({windowWidth: window.innerWidth});
  },
  componentDidMount: function() {
    window.addEventListener('resize', this.handleResize);
  },
  componentWillUnmount: function() {
    window.removeEventListener('resize', this.handleResize);
  },
  render: function() {
    return <div>Current window width: {this.state.windowWidth}</div>;
  }
});

React.renderComponent(<Box />, mountNode);
```

`componentDidMount` is called after the component's mounted and has a DOM representation. This is often a place where you'd attach generic DOM events.
