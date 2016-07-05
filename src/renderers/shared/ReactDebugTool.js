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
var ReactHostOperationHistoryDevtool = require('ReactHostOperationHistoryDevtool');
var ReactComponentTreeDevtool = require('ReactComponentTreeDevtool');
var ReactChildrenMutationWarningDevtool = require('ReactChildrenMutationWarningDevtool');
var ExecutionEnvironment = require('ExecutionEnvironment');

var performanceNow = require('performanceNow');
var warning = require('warning');

var eventHandlers = [];
var handlerDoesThrowForEvent = {};

function emitEvent(handlerFunctionName, arg1, arg2, arg3, arg4, arg5) {
  eventHandlers.forEach(function(handler) {
    try {
      if (handler[handlerFunctionName]) {
        handler[handlerFunctionName](arg1, arg2, arg3, arg4, arg5);
      }
    } catch (e) {
      warning(
        handlerDoesThrowForEvent[handlerFunctionName],
        'exception thrown by devtool while handling %s: %s',
        handlerFunctionName,
        e + '\n' + e.stack
      );
      handlerDoesThrowForEvent[handlerFunctionName] = true;
    }
  });
}

var isProfiling = false;
var flushHistory = [];
var lifeCycleTimerStack = [];
var currentFlushNesting = 0;
var currentFlushMeasurements = null;
var currentFlushStartTime = null;
var currentTimerDebugID = null;
var currentTimerStartTime = null;
var currentTimerNestedFlushDuration = null;
var currentTimerType = null;

function clearHistory() {
  ReactComponentTreeDevtool.purgeUnmountedComponents();
  ReactHostOperationHistoryDevtool.clearHistory();
}

function getTreeSnapshot(registeredIDs) {
  return registeredIDs.reduce((tree, id) => {
    var ownerID = ReactComponentTreeDevtool.getOwnerID(id);
    var parentID = ReactComponentTreeDevtool.getParentID(id);
    tree[id] = {
      displayName: ReactComponentTreeDevtool.getDisplayName(id),
      text: ReactComponentTreeDevtool.getText(id),
      updateCount: ReactComponentTreeDevtool.getUpdateCount(id),
      childIDs: ReactComponentTreeDevtool.getChildIDs(id),
      // Text nodes don't have owners but this is close enough.
      ownerID: ownerID || ReactComponentTreeDevtool.getOwnerID(parentID),
      parentID,
    };
    return tree;
  }, {});
}

function resetMeasurements() {
  var previousStartTime = currentFlushStartTime;
  var previousMeasurements = currentFlushMeasurements || [];
  var previousOperations = ReactHostOperationHistoryDevtool.getHistory();

  if (!isProfiling || currentFlushNesting === 0) {
    currentFlushStartTime = null;
    currentFlushMeasurements = null;
    clearHistory();
    return;
  }

  if (previousMeasurements.length || previousOperations.length) {
    var registeredIDs = ReactComponentTreeDevtool.getRegisteredIDs();
    flushHistory.push({
      duration: performanceNow() - previousStartTime,
      measurements: previousMeasurements || [],
      operations: previousOperations || [],
      treeSnapshot: getTreeSnapshot(registeredIDs),
    });
  }

  clearHistory();
  currentFlushStartTime = performanceNow();
  currentFlushMeasurements = [];
}

function checkDebugID(debugID) {
  warning(debugID, 'ReactDebugTool: debugID may not be empty.');
}

function beginLifeCycleTimer(debugID, timerType) {
  if (!isProfiling || currentFlushNesting === 0) {
    return;
  }
  warning(
    !currentTimerType,
    'There is an internal error in the React performance measurement code. ' +
    'Did not expect %s timer to start while %s timer is still in ' +
    'progress for %s instance.',
    timerType,
    currentTimerType || 'no',
    (debugID === currentTimerDebugID) ? 'the same' : 'another'
  );
  currentTimerStartTime = performanceNow();
  currentTimerNestedFlushDuration = 0;
  currentTimerDebugID = debugID;
  currentTimerType = timerType;
}

function endLifeCycleTimer(debugID, timerType) {
  if (!isProfiling || currentFlushNesting === 0) {
    return;
  }
  warning(
    currentTimerType === timerType,
    'There is an internal error in the React performance measurement code. ' +
    'We did not expect %s timer to stop while %s timer is still in ' +
    'progress for %s instance. Please report this as a bug in React.',
    timerType,
    currentTimerType || 'no',
    (debugID === currentTimerDebugID) ? 'the same' : 'another'
  );
  currentFlushMeasurements.push({
    timerType,
    instanceID: debugID,
    duration: performanceNow() - currentTimerStartTime - currentTimerNestedFlushDuration,
  });
  currentTimerStartTime = null;
  currentTimerNestedFlushDuration = null;
  currentTimerDebugID = null;
  currentTimerType = null;
}

function pauseCurrentLifeCycleTimer() {
  var currentTimer = {
    startTime: currentTimerStartTime,
    nestedFlushStartTime: performanceNow(),
    debugID: currentTimerDebugID,
    timerType: currentTimerType,
  };
  lifeCycleTimerStack.push(currentTimer);
  currentTimerStartTime = null;
  currentTimerNestedFlushDuration = null;
  currentTimerDebugID = null;
  currentTimerType = null;
}

function resumeCurrentLifeCycleTimer() {
  var {startTime, nestedFlushStartTime, debugID, timerType} = lifeCycleTimerStack.pop();
  var nestedFlushDuration = performanceNow() - nestedFlushStartTime;
  currentTimerStartTime = startTime;
  currentTimerNestedFlushDuration += nestedFlushDuration;
  currentTimerDebugID = debugID;
  currentTimerType = timerType;
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
  isProfiling() {
    return isProfiling;
  },
  beginProfiling() {
    if (isProfiling) {
      return;
    }

    isProfiling = true;
    flushHistory.length = 0;
    resetMeasurements();
  },
  endProfiling() {
    if (!isProfiling) {
      return;
    }

    isProfiling = false;
    resetMeasurements();
  },
  getFlushHistory() {
    return flushHistory;
  },
  onBeginFlush() {
    currentFlushNesting++;
    resetMeasurements();
    pauseCurrentLifeCycleTimer();
    emitEvent('onBeginFlush');
  },
  onEndFlush() {
    resetMeasurements();
    currentFlushNesting--;
    resumeCurrentLifeCycleTimer();
    emitEvent('onEndFlush');
  },
  onBeginLifeCycleTimer(debugID, timerType) {
    checkDebugID(debugID);
    emitEvent('onBeginLifeCycleTimer', debugID, timerType);
    beginLifeCycleTimer(debugID, timerType);
  },
  onEndLifeCycleTimer(debugID, timerType) {
    checkDebugID(debugID);
    endLifeCycleTimer(debugID, timerType);
    emitEvent('onEndLifeCycleTimer', debugID, timerType);
  },
  onBeginReconcilerTimer(debugID, timerType) {
    checkDebugID(debugID);
    emitEvent('onBeginReconcilerTimer', debugID, timerType);
  },
  onEndReconcilerTimer(debugID, timerType) {
    checkDebugID(debugID);
    emitEvent('onEndReconcilerTimer', debugID, timerType);
  },
  onBeginProcessingChildContext() {
    emitEvent('onBeginProcessingChildContext');
  },
  onEndProcessingChildContext() {
    emitEvent('onEndProcessingChildContext');
  },
  onHostOperation(debugID, type, payload) {
    checkDebugID(debugID);
    emitEvent('onHostOperation', debugID, type, payload);
  },
  onComponentHasMounted(debugID) {
    checkDebugID(debugID);
    emitEvent('onComponentHasMounted', debugID);
  },
  onComponentHasUpdated(debugID) {
    checkDebugID(debugID);
    emitEvent('onComponentHasUpdated', debugID);
  },
  onSetState() {
    emitEvent('onSetState');
  },
  onSetDisplayName(debugID, displayName) {
    checkDebugID(debugID);
    emitEvent('onSetDisplayName', debugID, displayName);
  },
  onSetChildren(debugID, childDebugIDs) {
    checkDebugID(debugID);
    emitEvent('onSetChildren', debugID, childDebugIDs);
  },
  onSetOwner(debugID, ownerDebugID) {
    checkDebugID(debugID);
    emitEvent('onSetOwner', debugID, ownerDebugID);
  },
  onSetParent(debugID, parentDebugID) {
    checkDebugID(debugID);
    emitEvent('onSetParent', debugID, parentDebugID);
  },
  onSetText(debugID, text) {
    checkDebugID(debugID);
    emitEvent('onSetText', debugID, text);
  },
  onMountRootComponent(debugID) {
    checkDebugID(debugID);
    emitEvent('onMountRootComponent', debugID);
  },
  onBeforeMountComponent(debugID, element) {
    checkDebugID(debugID);
    emitEvent('onBeforeMountComponent', debugID, element);
  },
  onMountComponent(debugID) {
    checkDebugID(debugID);
    emitEvent('onMountComponent', debugID);
  },
  onBeforeUpdateComponent(debugID, element) {
    checkDebugID(debugID);
    emitEvent('onBeforeUpdateComponent', debugID, element);
  },
  onUpdateComponent(debugID) {
    checkDebugID(debugID);
    emitEvent('onUpdateComponent', debugID);
  },
  onUnmountComponent(debugID) {
    checkDebugID(debugID);
    emitEvent('onUnmountComponent', debugID);
  },
  onTestEvent() {
    emitEvent('onTestEvent');
  },
};

ReactDebugTool.addDevtool(ReactInvalidSetStateWarningDevTool);
ReactDebugTool.addDevtool(ReactComponentTreeDevtool);
ReactDebugTool.addDevtool(ReactHostOperationHistoryDevtool);
ReactDebugTool.addDevtool(ReactChildrenMutationWarningDevtool);
var url = (ExecutionEnvironment.canUseDOM && window.location.href) || '';
if ((/[?&]react_perf\b/).test(url)) {
  ReactDebugTool.beginProfiling();
}

module.exports = ReactDebugTool;
