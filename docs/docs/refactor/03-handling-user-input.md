# Handling User Input

You've already [learned how to display data](./02-displaying-data.html) with React. Now let's look at how to make our UIs interactive.

## A simple example

```javascript
/** @jsx React.DOM */

var LikeButton = React.createClass({
  getInitialState: function() {
    return {liked: false};
  },
  handleClick: function(event) {
    this.setState({liked: !this.state.liked});
  },
  render: function() {
    var text = this.state.liked ? 'like' : 'unlike';
    return (
      <p onClick={this.handleClick}>
        You {text} this. Click to toggle.
      </p>
    );
  }
});

React.renderComponent(
  <LikeButton />,
  document.getElementById('example')
);
```

## Event handling and synthetic events

With React you simply pass your event handler as a camelCased prop similar to how you'd do it in normal HTML. React ensures that all events behave identically in IE8 and above by implementing a synthetic event system. That is, React knows how to bubble and capture events according to the spec, and the events passed to your event handler are guaranteed to be consistent with [the W3C spec](http://www.w3.org/TR/DOM-Level-3-Events/), regardless of which browser you're using.

## Under the hood: autoBind and event delegation

Under the hood React does a few things to keep your code performant and easy to understand.

**Autobinding.** Every method is automatically bound to its component instance. React caches the bound method such that it's extremely CPU and memory efficient. It's also less typing!

**Event delegation.** React doesn't actually attach event handlers to the nodes themselves. When React starts up, it starts listening for all events at the top level using a single event listener. When a component is mounted or unmounted, the event handlers are simply added or removed from a fast internal event mapping. When the event occurs, React knows how to dispatch it using this mapping. When there are no event handlers left in the mapping, React's event handlers are simple no-ops

## How state works

A common way to inform React of a data change is by calling `setState(data, callback)`. This method merges `data` into `this.state` and re-renders the component. When the component finishes re-rendering, the optional `callback` is called. Most of the time you'll never need to provide a `callback` since state tends to be so minimal.

## What components should have state?

Most of your components should simply take some data from `props` and render it. However, sometimes you need to respond to user input, a server request or the passage of time. For this you use state.

**Try to keep as many of your components as possible stateless.** By doing this you'll isolate the state to its most logical place and minimize redundancy, making it easier to reason about your application.

A common pattern is to create several stateless components that just render data, and have a stateful component above them in the hierarchy that passes its state to its children via `props`. The stateful component encapsulates all of the interaction logic, while the stateless components take care of rendering data in a declarative way.

## What should go in state?

**`this.state` should contain any data that the component's event handlers will change that should trigger a UI update.** In real apps this data tends to be very small and JSON-serializable. When building a stateful component, think about the minimal possible representation of its state, and only store those properties in `this.state`. Inside of `render()` simply compute any other information you need based on this state. You'll find that thinking about and writing applications in this way tends to lead to the most correct application, since adding redundant or computed values to state means that you need to explicitly keep them in sync rather than rely on React computing them for you.