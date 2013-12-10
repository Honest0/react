---
id: props-in-getInitialState-as-anti-pattern
title: Using State to Cache Calculations Is an Anti-Pattern
layout: tips
permalink: props-in-getInitialState-as-anti-pattern.html
prev: componentWillReceiveProps-not-triggered-after-mounting.html
next: dom-event-listeners.html
---

> Note:
>
> This isn't really a React-specific tip, as such anti-patterns often occur in code in general; in this case, React simply points them out more clearly.

Using state to cache values calculated from props (for example in `getInitialState`) often leads to duplication of "source of truth", i.e. where the real data is. Whenever possible, compute values on-the-fly to ensure that they don't get out of sync later on and cause maintenance trouble.

Bad example:

```js
/** @jsx React.DOM */

var MessageBox = React.createClass({
  getInitialState: function() {
    return {nameWithQualifier: "Mr. " + this.props.name};
  },
  render: function() {
    return <div>{this.state.nameWithQualifier}</div>;
  }
});

React.renderComponent(<MessageBox name="Rogers"/>, mountNode);
```

Better:

```js
/** @jsx React.DOM */

var MessageBox = React.createClass({
  render: function() {
    return <div>{"Mr. " + this.props.name}</div>;
  }
});

React.renderComponent(<MessageBox name="Rogers"/>, mountNode);
```

For more complex logic:

```js
/** @jsx React.DOM */

var MessageBox = React.createClass({
  render: function() {
    return <div>{this.getNameWithQualifier(this.props.name)}</div>;
  },
  getNameWithQualifier: function(name) {
    return 'Mr. ' + name;
  }
});

React.renderComponent(<MessageBox name="Rogers"/>, mountNode);
```
