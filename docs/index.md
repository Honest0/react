---
layout: page
title: A JavaScript library for building user interfaces
id: home
---

<section class="light home-section">
  <div class="marketing-row">
    <div class="marketing-col">
      <h3>Declarative</h3>
      <p>
        React uses a declarative paradigm that makes it easier to reason about
        your application.
      </p>
    </div>
    <div class="marketing-col">
      <h3>Efficient</h3>
      <p>
        React computes the minimal set of changes necessary to keep your DOM
        up-to-date.
      </p>
    </div>
    <div class="marketing-col">
      <h3>Flexible</h3>
      <p>
        React works with the libraries and frameworks that you already know.
      </p>
    </div>
  </div>
</section>
<hr class="home-divider" />
<section class="home-section">
  <div id="examples">
    <div class="example">
      <h3>A Simple Component</h3>
      <p>
        React components implement a `render()` method that takes input data and
        returns what to display. This example uses an XML-like syntax called
        JSX. Input data that is passed into the component can be accessed by
        `render()` via `this.props`.<br />
        <strong>JSX is optional and not required to use React.</strong>
      </p>
      <div id="helloExample"></div>
    </div>
    <div class="example">
      <h3>A Stateful Component</h3>
      <p>
        In addition to taking input data (accessed via `this.props`), a
        component can maintain internal state data (accessed via `this.state`).
        When a component's state data changes, the rendered markup will be
        updated by re-invoking `render()`.<br />
        <strong>This example demonstrates use of React without JSX.</strong>
      </p>
      <div id="timerExample"></div>
    </div>
    <div class="example">
      <h3>An Application</h3>
      <p>
        Using `props` and `state`, we can put together a small Todo application.
        This example uses `state` to track the current list of items as well as
        the text that the user has entered. Although event handlers appear to be
        rendered inline, they will be collected and implemented using event
        delegation. 
      </p>
      <div id="todoExample"></div>
    </div>
    <div class="example">
      <h3>A Component Using External Plugins</h3>
      <p>
        React is flexible and provides hooks that allow you to interface with
        other libraries and frameworks. This example uses Showdown, an external
        Markdown library, to convert the textarea's value in real-time.
      </p>
      <div id="markdownExample"></div>
    </div>
  </div>
  <script type="text/javascript" src="js/examples/hello.js"></script>
  <script type="text/javascript" src="js/examples/timer.js"></script>
  <script type="text/javascript" src="js/examples/todo.js"></script>
  <script type="text/javascript" src="js/examples/markdown.js"></script>
</section>
<hr class="home-divider" />
<section class="home-bottom-section">
  <div class="buttons-unit">
    <a href="docs/getting-started.html" class="button">Get Started</a>
    <a href="downloads.html" class="button">Download React v{{site.react_version}}</a>
  </div>
</section>
