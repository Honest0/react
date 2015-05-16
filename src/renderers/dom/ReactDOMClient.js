/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMClient
 */

/* globals __REACT_DEVTOOLS_GLOBAL_HOOK__*/

'use strict';

var ReactCurrentOwner = require('ReactCurrentOwner');
var ReactDOMTextComponent = require('ReactDOMTextComponent');
var ReactDefaultInjection = require('ReactDefaultInjection');
var ReactInstanceHandles = require('ReactInstanceHandles');
var ReactMount = require('ReactMount');
var ReactPerf = require('ReactPerf');
var ReactReconciler = require('ReactReconciler');

var findDOMNode = require('findDOMNode');
var warning = require('warning');

ReactDefaultInjection.inject();

var render = ReactPerf.measure('React', 'render', ReactMount.render);

var React = {
  constructAndRenderComponent: ReactMount.constructAndRenderComponent,
  constructAndRenderComponentByID: ReactMount.constructAndRenderComponentByID,
  findDOMNode: findDOMNode,
  render: render,
  unmountComponentAtNode: ReactMount.unmountComponentAtNode
};

// Inject the runtime into a devtools global hook regardless of browser.
// Allows for debugging when the hook is injected on the page.
if (
  typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' &&
  typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.inject === 'function') {
  __REACT_DEVTOOLS_GLOBAL_HOOK__.inject({
    CurrentOwner: ReactCurrentOwner,
    InstanceHandles: ReactInstanceHandles,
    Mount: ReactMount,
    Reconciler: ReactReconciler,
    TextComponent: ReactDOMTextComponent
  });
}

if (__DEV__) {
  var ExecutionEnvironment = require('ExecutionEnvironment');
  if (ExecutionEnvironment.canUseDOM && window.top === window.self) {

    // If we're in Chrome, look for the devtools marker and provide a download
    // link if not installed.
    if (navigator.userAgent.indexOf('Chrome') > -1) {
      if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
        console.debug(
          'Download the React DevTools for a better development experience: ' +
          'https://fb.me/react-devtools'
        );
      }
    }

    // If we're in IE8, check to see if we are in combatibility mode and provide
    // information on preventing compatibility mode
    var ieCompatibilityMode =
      document.documentMode && document.documentMode < 8;

    warning(
      !ieCompatibilityMode,
      'Internet Explorer is running in compatibility mode; please add the ' +
      'following tag to your HTML to prevent this from happening: ' +
      '<meta http-equiv="X-UA-Compatible" content="IE=edge" />'
    );

    var expectedFeatures = [
      // shims
      Array.isArray,
      Array.prototype.every,
      Array.prototype.forEach,
      Array.prototype.indexOf,
      Array.prototype.map,
      Date.now,
      Function.prototype.bind,
      Object.keys,
      String.prototype.split,
      String.prototype.trim,

      // shams
      Object.create,
      Object.freeze
    ];

    for (var i = 0; i < expectedFeatures.length; i++) {
      if (!expectedFeatures[i]) {
        console.error(
          'One or more ES5 shim/shams expected by React are not available: ' +
          'https://fb.me/react-warning-polyfills'
        );
        break;
      }
    }
  }
}

module.exports = React;
