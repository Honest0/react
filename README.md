# [React](http://facebook.github.io/react) [![Build Status](https://travis-ci.org/facebook/react.png?branch=master)](https://travis-ci.org/facebook/react)

React is a JavaScript library for building user interfaces.

* **Declarative:** React uses a declarative paradigm that makes it easier to reason about your application.
* **Efficient:** React minimizes interactions with the DOM by using a mock representation of the DOM.
* **Flexible:** React works with the libraries and frameworks that you already know.

[Learn how to use React in your own project.](http://facebook.github.io/react/docs/getting-started.html)

## Examples

We have several examples [on the website](http://facebook.github.io/react). Here is the first one to get you started:

```js
/** @jsx React.DOM */
var HelloMessage = React.createClass({
  render: function() {
    return <div>{'Hello ' + this.props.name}</div>;
  }
});

React.renderComponent(
  <HelloMessage name="John" />,
  document.getElementById('container')
);
```

This example will render "Hello John" into a container on the page.

You'll notice that we used an XML-like syntax; [we call it JSX](http://facebook.github.io/react/docs/syntax.html). JSX is not required to use React, but it makes code more readable, and writing it feels like writing HTML. A simple transform is included with React that allows converting JSX into native JavaScript for browsers to digest.

## Installation

The fastest way to get started is to serve JavaScript from the CDN:

```html
<!-- The core React library -->
<script src="http://fb.me/react-0.3.0.min.js"></script>
<!-- In-browser JSX transformer, remove when pre-compiling JSX. -->
<script src="http://fb.me/JSXTransformer-0.3.0.js"></script>
```

We've also built a [starter kit](http://facebook.github.io/react/downloads/react-0.3.0.zip) which might be useful if this is your first time using React. It includes a webpage with an example of using React with live code.

If you'd like to use [bower](http://bower.io), it's as easy as:

```sh
bower install react
```

## Contribute

The main purpose of this repository is to continue to evolve React core, making it faster and easier to use. If you're interested in helping with that, then keep reading. If you're not interested in helping right now that's ok too :) Any feedback you have about using React would be greatly appreciated.

### Building Your Copy of React

The process to build `react.js` is built entirely on top of node.js, using many libraries you may already be familiar with.

#### Prerequisites

* You have `node` installed at v0.10.0+ (it might work at lower versions, we just haven't tested).
* You are familiar with `npm` and know whether or not you need to use `sudo` when installing packages globally.
* You are familiar with `git`.

#### Build

Once you have the repository cloned, building a copy of `react.js` is really easy.

```sh
# grunt-cli is needed by grunt; you might have this installed already
npm install -g grunt-cli
npm install
grunt build
```

At this point, you should now have a `build/` directory populated with everything you need to use React. The examples should all work.

### Grunt

We use grunt to automate many tasks. Run `grunt -h` to see a mostly complete listing. The important ones to know:

```sh
# Create test build & run tests with PhantomJS
grunt test
# Lint the core library code with JSHint
grunt lint
# Lint package code
grunt lint:package
# Wipe out build directory
grunt clean
```

### More…

There's only so much we can cram in here. To read more about the community and guidelines for submitting pull requests, please read the [Contributing document](CONTRIBUTING.md).
