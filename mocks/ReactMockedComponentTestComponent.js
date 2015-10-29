/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactMockedComponentTestComponent
 */

'use strict';

var React = require('React');

var ReactMockedComponentTestComponent = React.createClass({
  getDefaultProps: function() {
    return {bar: 'baz'};
  },

  getInitialState: function() {
    return {foo: 'bar'};
  },

  hasCustomMethod: function() {
    return true;
  },

  render: function() {
    return <span />;
  },

});

module.exports = ReactMockedComponentTestComponent;
