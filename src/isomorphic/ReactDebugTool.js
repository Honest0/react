/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDebugTool
 */

'use strict';

var ReactInvalidSetStateWarningDevTool = require('ReactInvalidSetStateWarningDevTool');
var warning = require('warning');

var eventHandlers = [];
var handlerDoesThrowForEvent = {};

function emitEvent(handlerFunctionName, arg1, arg2, arg3, arg4, arg5) {
  if (__DEV__) {
    eventHandlers.forEach(function(handler) {
      try {
        if (handler[handlerFunctionName]) {
          handler[handlerFunctionName](arg1, arg2, arg3, arg4, arg5);
        }
      } catch (e) {
        warning(
          !handlerDoesThrowForEvent[handlerFunctionName],
          'exception thrown by devtool while handling %s: %s',
          handlerFunctionName,
          e.message
        );
        handlerDoesThrowForEvent[handlerFunctionName] = true;
      }
    });
  }
}

var ReactDebugTool = {
  addDevtool(devtool) {
    eventHandlers.push(devtool);
  },
  removeDevtool(devtool) {
    for (var i = 0; i < eventHandlers.length; i++) {
      if (eventHandlers[i] === devtool) {
        eventHandlers.splice(i, 1);
        i--;
      }
    }
  },
  onBeginProcessingChildContext() {
    emitEvent('onBeginProcessingChildContext');
  },
  onEndProcessingChildContext() {
    emitEvent('onEndProcessingChildContext');
  },
  onSetState() {
    emitEvent('onSetState');
  },
  onSetIsComposite(debugID, isComposite) {
    emitEvent('onSetIsComposite', debugID, isComposite);
  },
  onSetDisplayName(debugID, displayName) {
    emitEvent('onSetDisplayName', debugID, displayName);
  },
  onSetChildren(debugID, childDebugIDs) {
    emitEvent('onSetChildren', debugID, childDebugIDs);
  },
  onSetOwner(debugID, ownerDebugID) {
    emitEvent('onSetOwner', debugID, ownerDebugID);
  },
  onSetText(debugID, text) {
    emitEvent('onSetText', debugID, text);
  },
  onMountRootComponent(debugID) {
    emitEvent('onMountRootComponent', debugID);
  },
  onMountComponent(debugID, nativeContainerDebugID) {
    emitEvent('onMountComponent', debugID, nativeContainerDebugID);
  },
  onUpdateComponent(debugID) {
    emitEvent('onUpdateComponent', debugID);
  },
  onUnmountComponent(debugID) {
    emitEvent('onUnmountComponent', debugID);
  },
  onUnmountNativeContainer(nativeContainerDebugID) {
    emitEvent('onUnmountNativeContainer', nativeContainerDebugID);
  },
};

ReactDebugTool.addDevtool(ReactInvalidSetStateWarningDevTool);

module.exports = ReactDebugTool;
