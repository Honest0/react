---
id: docs-syntax
title: JSX Syntax
description: Writing JavaScript with XML syntax.
layout: docs
prev: common-questions.html
next: component-basics.html
---

JSX is a JavaScript XML syntax extension recommended (but not required) for use
with React.

JSX makes code that deeply nests React components more readable, and writing it
feels like writing HTML. React documentation examples make use of JSX.

## Why JSX?

First of all, **don't use JSX if you don't like it!** All of React's features
work just fine without using JSX. Simply construct your markup using the functions
on `React.DOM`. For example, here's how to construct a simple link:

```javascript
var mylink = React.DOM.a({href: 'http://facebook.github.io/react'}, 'Hello React');
```

However, we like JSX for a bunch of reasons:

- It's easier to visualize the structure of the DOM
- Designers are more comfortable making changes
- It's familiar for those who have used MXML or XAML

## The Transform

JSX transforms XML-like syntax into native JavaScript. It turns XML elements and
attributes into function calls and objects, respectively.

```javascript
var Nav;
// Input (JSX):
var app = <Nav color="blue" />;
// Output (JS):
var app = Nav({color:'blue'});
```

Notice that in order to use `<Nav />`, the `Nav` variable must be in scope.

JSX also allows specifying children using XML syntax:

```javascript
var Nav, Profile;
// Input (JSX):
var app = <Nav color="blue"><Profile>click</Profile></Nav>;
// Output (JS):
var app = Nav({color:'blue'}, Profile({}, 'click'));
```

The [Getting Started](getting-started.html) guide shows how to setup JSX
compilation.

> Note:
>
> Details about the code transform are given here to increase understanding, but
> your code should not rely on these implementation details.

## React and JSX

React and JSX are independent technologies, but JSX was primarily built with
React in mind. The two valid uses of JSX are:

- To construct instances of React DOM components (`React.DOM.*`).
- To construct instances of composite components created with
  `React.createClass()`.

**React DOM Components**

To construct a `<div>` is to create a variable that refers to `React.DOM.div`.

```javascript
var div = React.DOM.div;
var app = <div className="appClass">Hello, React!</div>;
```

**React Component Components**

To construct an instance of a composite component, create a variable that
references the class.

```javascript
var MyComponent = React.createClass({/*...*/});
var app = <MyComponent someProperty={true} />;
```

See [Component Basics](component-basics.html) to learn more about components.

> Note:
>
> Since JSX is JavaScript, identifiers such as `class` and `for` are discouraged
> as XML attribute names. Instead, React DOM components expect attributes like
> `className` and `htmlFor`, respectively.

## DOM Convenience

Having to define variables for every type of DOM element can get tedious
(e.g. `var div, span, h1, h2, ...`). JSX provides a convenience to address this
problem by allowing you to specify a variable in an `@jsx` docblock field. JSX
will use that field to find DOM components.

```javascript
/**
 * @jsx React.DOM
 */
var Nav;
// Input (JSX):
var tree = <Nav><span /></Nav>;
// Output (JS):
var tree = Nav({}, React.DOM.span({}));
```

> Remember:
>
> JSX simply transforms elements into function calls and has no notion of the
> DOM. The docblock parameter is only a convenience to resolve the most commonly
> used elements. In general, JSX has no notion of the DOM.

## JavaScript Expressions

#### Attribute Expressions

To use a JavaScript expression as an attribute value, wrap the expression in a
pair of curly braces (`{}`) instead of quotes (`""`).

```javascript
// Input (JSX):
var person = <Person name={window.isLoggedIn ? window.name : ''} />;
// Output (JS):
var person = Person({name: window.isLoggedIn ? window.name : ''});
```

#### Child Expressions

Likewise, JavaScript expressions may be used to express children:

```javascript
// Input (JSX):
var content = <Container>{window.isLoggedIn ? <Nav /> : <Login />}</Container>;
// Output (JS):
var content = Container({}, window.isLoggedIn ? <Nav /> : <Login />);
```

## Tooling

Beyond the compilation step, JSX does not require any special tools.

- Many editors already include reasonable support for JSX (Vim, Emacs js2-mode).
- Linting provides accurate line numbers after compiling without sourcemaps.
- Elements use standard scoping so linters can find usage of out-of-scope
  components.

## Prior Work

JSX is similar to several other JavaScript embedded XML language
proposals/projects. Some of the features of JSX that distinguish it from similar
efforts include:

- JSX is a simple syntactic transform.
- JSX neither provides nor requires a runtime library.
- JSX does not alter or add to the semantics of JavaScript.
