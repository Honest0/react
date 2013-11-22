---
id: initial-ajax
title: Load Initial Data via AJAX
layout: tips
permalink: initial-ajax.html
prev: dom-event-listeners.html
next: false-in-jsx.html
---

Fetch data in `componentDidMount`. When the response arrives, store the data in state, triggering a render to update your UI.

This example fetches the desired Github user's latest gist:

```js
/** @jsx React.DOM */

var UserGist = React.createClass({
  getInitialState: function() {
    return {
      username: '',
      lastGistUrl: ''
    };
  },
  componentDidMount: function() {
    $.get(this.props.source, function(result) {
      var lastGist = result[0];
      this.setState({
        username: lastGist.user.login,
        lastGistUrl: lastGist.html_url
      });
    }.bind(this));
  },
  render: function() {
    return (
      <div>
        {this.state.username}'s last gist is
        <a href={this.state.lastGistUrl}>here</a>.
      </div>
    );
  }
});

React.renderComponent(
  <UserGist source="https://api.github.com/users/octocat/gists" />,
  mountNode
);
```
