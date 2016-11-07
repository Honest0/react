/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactEventListener
 */

'use strict';

var EventListener = require('EventListener');
var ExecutionEnvironment = require('ExecutionEnvironment');
var PooledClass = require('PooledClass');
var ReactControlledComponent = require('ReactControlledComponent');
var ReactDOMComponentTree = require('ReactDOMComponentTree');
var ReactGenericBatching = require('ReactGenericBatching');

var getEventTarget = require('getEventTarget');
var getUnboundedScrollPosition = require('getUnboundedScrollPosition');

/**
 * Find the deepest React component completely containing the root of the
 * passed-in instance (for use when entire React trees are nested within each
 * other). If React trees are not nested, returns null.
 */
function findParent(inst) {
  // TODO: It may be a good idea to cache this to prevent unnecessary DOM
  // traversal, but caching is difficult to do correctly without using a
  // mutation observer to listen for all DOM changes.
  while (inst._hostParent) {
    inst = inst._hostParent;
  }
  var rootNode = ReactDOMComponentTree.getNodeFromInstance(inst);
  var container = rootNode.parentNode;
  return ReactDOMComponentTree.getClosestInstanceFromNode(container);
}

// Used to store ancestor hierarchy in top level callback
function TopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst) {
  this.topLevelType = topLevelType;
  this.nativeEvent = nativeEvent;
  this.targetInst = targetInst;
  this.ancestors = [];
}
Object.assign(TopLevelCallbackBookKeeping.prototype, {
  destructor: function() {
    this.topLevelType = null;
    this.nativeEvent = null;
    this.targetInst = null;
    this.ancestors.length = 0;
  },
});
PooledClass.addPoolingTo(
  TopLevelCallbackBookKeeping,
  PooledClass.threeArgumentPooler
);

function handleTopLevelImpl(bookKeeping) {
  var targetInst = bookKeeping.targetInst;

  // Loop through the hierarchy, in case there's any nested components.
  // It's important that we build the array of ancestors before calling any
  // event handlers, because event handlers can modify the DOM, leading to
  // inconsistencies with ReactMount's node cache. See #1105.
  var ancestor = targetInst;
  do {
    bookKeeping.ancestors.push(ancestor);
    ancestor = ancestor && findParent(ancestor);
  } while (ancestor);

  for (var i = 0; i < bookKeeping.ancestors.length; i++) {
    targetInst = bookKeeping.ancestors[i];
    ReactEventListener._handleTopLevel(
      bookKeeping.topLevelType,
      targetInst,
      bookKeeping.nativeEvent,
      getEventTarget(bookKeeping.nativeEvent)
    );
  }
}

function scrollValueMonitor(cb) {
  var scrollPosition = getUnboundedScrollPosition(window);
  cb(scrollPosition);
}

var ReactEventListener = {
  _enabled: true,
  _handleTopLevel: null,

  WINDOW_HANDLE: ExecutionEnvironment.canUseDOM ? window : null,

  setHandleTopLevel: function(handleTopLevel) {
    ReactEventListener._handleTopLevel = handleTopLevel;
  },

  setEnabled: function(enabled) {
    ReactEventListener._enabled = !!enabled;
  },

  isEnabled: function() {
    return ReactEventListener._enabled;
  },


  /**
   * Traps top-level events by using event bubbling.
   *
   * @param {string} topLevelType Record from `EventConstants`.
   * @param {string} handlerBaseName Event name (e.g. "click").
   * @param {object} element Element on which to attach listener.
   * @return {?object} An object with a remove function which will forcefully
   *                  remove the listener.
   * @internal
   */
  trapBubbledEvent: function(topLevelType, handlerBaseName, element) {
    if (!element) {
      return null;
    }
    return EventListener.listen(
      element,
      handlerBaseName,
      ReactEventListener.dispatchEvent.bind(null, topLevelType)
    );
  },

  /**
   * Traps a top-level event by using event capturing.
   *
   * @param {string} topLevelType Record from `EventConstants`.
   * @param {string} handlerBaseName Event name (e.g. "click").
   * @param {object} element Element on which to attach listener.
   * @return {?object} An object with a remove function which will forcefully
   *                  remove the listener.
   * @internal
   */
  trapCapturedEvent: function(topLevelType, handlerBaseName, element) {
    if (!element) {
      return null;
    }
    return EventListener.capture(
      element,
      handlerBaseName,
      ReactEventListener.dispatchEvent.bind(null, topLevelType)
    );
  },

  monitorScrollValue: function(refresh) {
    var callback = scrollValueMonitor.bind(null, refresh);
    EventListener.listen(window, 'scroll', callback);
  },

  dispatchEvent: function(topLevelType, nativeEvent) {
    if (!ReactEventListener._enabled) {
      return;
    }

    var nativeEventTarget = getEventTarget(nativeEvent);
    var targetInst = ReactDOMComponentTree.getClosestInstanceFromNode(
      nativeEventTarget
    );

    var bookKeeping = TopLevelCallbackBookKeeping.getPooled(
      topLevelType,
      nativeEvent,
      targetInst
    );

    try {
      // Event queue being processed in the same cycle allows
      // `preventDefault`.
      ReactGenericBatching.batchedUpdates(handleTopLevelImpl, bookKeeping);
      if (bookKeeping.targetInst) {
        // Here we wait until all updates have propagated, which is important
        // when using controlled components within layers:
        // https://github.com/facebook/react/issues/1698
        // Then we restore state of any controlled component.
        ReactControlledComponent.restoreStateIfNeeded(bookKeeping.targetInst);
      }
    } finally {
      TopLevelCallbackBookKeeping.release(bookKeeping);
    }
  },
};

module.exports = ReactEventListener;
