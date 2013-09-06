/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule ReactTransitionGroup
 */

"use strict";

var React = require('React');
var ReactTransitionableChild = require('ReactTransitionableChild');
var ReactTransitionKeySet = require('ReactTransitionKeySet');

var invariant = require('invariant');

var ReactTransitionGroupMixin = {
  componentWillMount: function() {
    // _transitionGroupCurrentKeys stores the union of previous *and* next keys.
    // If this were a component we'd store it as state, however, since this must
    // be a mixin, we need to keep the result of the union of keys in each
    // call to animateChildren() which happens in render(), so we can't
    // call setState() in there.
    this._transitionGroupCurrentKeys = {};
  },

  /**
   * Render some children in a transitionable way.
   */
  renderTransitionableChildren: function(sourceChildren) {
    invariant(
      this.getTransitionConfig,
      'renderTransitionableChildren(): You must provide a ' +
      'getTransitionConfig() method.'
    );

    var children = {};
    var childMapping = ReactTransitionKeySet.getChildMapping(sourceChildren);
    var transitionConfig = this.getTransitionConfig();
    var currentKeys = ReactTransitionKeySet.mergeKeySets(
      this._transitionGroupCurrentKeys,
      ReactTransitionKeySet.getKeySet(sourceChildren)
    );

    for (var key in currentKeys) {
      // Here is how we keep the nodes in the DOM. ReactTransitionableChild
      // knows how to hold onto its child if it changes to undefined. Here, we
      // may look up an old key in the new children, and it may switch to
      // undefined. React's reconciler will keep the ReactTransitionableChild
      // instance alive such that we can animate it.
      if (childMapping[key] || transitionConfig.leave) {
        children[key] = ReactTransitionableChild({
          name: transitionConfig.name,
          enter: transitionConfig.enter,
          onDoneLeaving: this._handleDoneLeaving.bind(this, key)
        }, childMapping[key]);
      }
    }

    this._transitionGroupCurrentKeys = currentKeys;

    return children;
  },

  _handleDoneLeaving: function(key) {
    // When the leave animation finishes, we should blow away the actual DOM
    // node.
    delete this._transitionGroupCurrentKeys[key];
    this.forceUpdate();
  }
};

var ReactTransitionGroup = React.createClass({
  mixins: [ReactTransitionGroupMixin],

  getDefaultProps: function() {
    return {
      transitionEnter: true,
      transitionLeave: true,
      component: React.DOM.span
    };
  },

  getTransitionConfig: function() {
    return {
      name: this.props.transitionName,
      enter: this.props.transitionEnter,
      leave: this.props.transitionLeave
    };
  },

  render: function() {
    return this.transferPropsTo(
      this.props.component(
        {
          transitionName: null,
          transitionEnter: null,
          transitionLeave: null,
          component: null
        },
        this.renderTransitionableChildren(this.props.children)
      )
    );
  }
});

module.exports = ReactTransitionGroup;
