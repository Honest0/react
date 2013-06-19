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
 * @providesModule TextChangeEventPlugin
 */

"use strict";

var EventConstants = require('EventConstants');
var EventPluginHub = require('EventPluginHub');
var EventPropagators = require('EventPropagators');
var ExecutionEnvironment = require('ExecutionEnvironment');
var SyntheticEvent = require('SyntheticEvent');

var isEventSupported = require('isEventSupported');
var keyOf = require('keyOf');

var topLevelTypes = EventConstants.topLevelTypes;

var eventTypes = {
  textChange: {
    phasedRegistrationNames: {
      bubbled: keyOf({onTextChange: null}),
      captured: keyOf({onTextChangeCapture: null})
    }
  }
};

var isInputSupported;
if (ExecutionEnvironment.canUseDOM) {
  // IE9 claims to support the input event but fails to trigger it when
  // deleting text, so we ignore its input events
  isInputSupported = isEventSupported('input') && (
    !("documentMode" in document) || document.documentMode > 9
  );
}

var hasInputCapabilities = function(elem) {
  // The HTML5 spec lists many more types than `text` and `password` on which
  // the input event is triggered but none of them exist in old IE, so we don't
  // check them here.
  // TODO: <textarea> should be supported too but IE seems to reset the
  // selection when changing textarea contents during a selectionchange event
  // so it's not listed here for now.
  return (
    elem.nodeName === 'INPUT' &&
    (elem.type === 'text' || elem.type === 'password')
  );
};

var activeElement = null;
var activeElementID = null;
var activeElementValue = null;
var activeElementValueProp = null;

/**
 * (For old IE.) Replacement getter/setter for the `value` property that gets
 * set on the active element.
 */
var newValueProp =  {
  get: function() {
    return activeElementValueProp.get.call(this);
  },
  set: function(val) {
    activeElementValue = val;
    activeElementValueProp.set.call(this, val);
  }
};

/**
 * (For old IE.) Starts tracking propertychange events on the passed-in element
 * and override the value property so that we can distinguish user events from
 * value changes in JS.
 */
var startWatching = function(target, targetID) {
  activeElement = target;
  activeElementID = targetID;
  activeElementValue = target.value;
  activeElementValueProp = Object.getOwnPropertyDescriptor(
    target.constructor.prototype,
    'value'
  );

  Object.defineProperty(activeElement, 'value', newValueProp);
  activeElement.attachEvent('onpropertychange', handlePropertyChange);
};

/**
 * (For old IE.) Removes the event listeners from the currently-tracked element,
 * if any exists.
 */
var stopWatching = function() {
  if (!activeElement) {
    return;
  }

  // delete restores the original property definition
  delete activeElement.value;
  activeElement.detachEvent('onpropertychange', handlePropertyChange);

  activeElement = null;
  activeElementID = null;
  activeElementValue = null;
  activeElementValueProp = null;
};

/**
 * (For old IE.) Handles a propertychange event, sending a textChange event if
 * the value of the active element has changed.
 */
var handlePropertyChange = function(nativeEvent) {
  if (nativeEvent.propertyName !== "value") {
    return;
  }
  var value = nativeEvent.srcElement.value;
  if (value === activeElementValue) {
    return;
  }
  activeElementValue = value;

  var event = SyntheticEvent.getPooled(
    eventTypes.textChange,
    activeElementID,
    nativeEvent
  );
  EventPropagators.accumulateTwoPhaseDispatches(event);

  // If propertychange bubbled, we'd just bind to it like all the other events
  // and have it go through ReactEventTopLevelCallback. Since it doesn't, we
  // manually listen for the propertychange event and so we have to enqueue and
  // process the abstract event manually.
  EventPluginHub.enqueueEvents(event);
  EventPluginHub.processEventQueue();
};

/**
 * If a textChange event should be fired, returns the target's ID.
 */
var targetIDForTextChangeEvent;
if (isInputSupported) {
  targetIDForTextChangeEvent = function(
      topLevelType,
      topLevelTarget,
      topLevelTargetID) {
    if (topLevelType === topLevelTypes.topInput) {
      // In modern browsers (i.e., not IE8 or IE9), the input event is exactly
      // what we want so fall through here and trigger an abstract event...
      if (topLevelTarget.nodeName === 'TEXTAREA') {
        // ...unless it's a textarea, in which case we don't fire an event (so
        // that we have consistency with our old-IE shim).
        return;
      }
      return topLevelTargetID;
    }
  };
} else {
  targetIDForTextChangeEvent = function(
      topLevelType,
      topLevelTarget,
      topLevelTargetID) {
    if (topLevelType === topLevelTypes.topFocus) {
      // In IE8, we can capture almost all .value changes by adding a
      // propertychange handler and looking for events with propertyName
      // equal to 'value'
      // In IE9, propertychange fires for most input events but is buggy and
      // doesn't fire when text is deleted, but conveniently, selectionchange
      // appears to fire in all of the remaining cases so we catch those and
      // forward the event if the value has changed
      // In either case, we don't want to call the event handler if the value
      // is changed from JS so we redefine a setter for `.value` that updates
      // our activeElementValue variable, allowing us to ignore those changes
      if (hasInputCapabilities(topLevelTarget)) {
        // stopWatching() should be a noop here but we call it just in case we
        // missed a blur event somehow.
        stopWatching();
        startWatching(topLevelTarget, topLevelTargetID);
      }
    } else if (topLevelType === topLevelTypes.topBlur) {
      stopWatching();
    } else if (
        topLevelType === topLevelTypes.topSelectionChange ||
        topLevelType === topLevelTypes.topKeyUp ||
        topLevelType === topLevelTypes.topKeyDown) {
      // On the selectionchange event, the target is just document which isn't
      // helpful for us so just check activeElement instead.
      //
      // 99% of the time, keydown and keyup aren't necessary. IE8 fails to fire
      // propertychange on the first input event after setting `value` from a
      // script and fires only keydown, keypress, keyup. Catching keyup usually
      // gets it and catching keydown lets us fire an event for the first
      // keystroke if user does a key repeat (it'll be a little delayed: right
      // before the second keystroke). Other input methods (e.g., paste) seem to
      // fire selectionchange normally.
      if (activeElement && activeElement.value !== activeElementValue) {
        activeElementValue = activeElement.value;
        return activeElementID;
      }
    }
  };
}

var TextChangeEventPlugin = {

  eventTypes: eventTypes,

  /**
   * @param {string} topLevelType Record from `EventConstants`.
   * @param {DOMEventTarget} topLevelTarget The listening component root node.
   * @param {string} topLevelTargetID ID of `topLevelTarget`.
   * @param {object} nativeEvent Native browser event.
   * @return {*} An accumulation of synthetic events.
   * @see {EventPluginHub.extractEvents}
   */
  extractEvents: function(
      topLevelType,
      topLevelTarget,
      topLevelTargetID,
      nativeEvent) {
    var targetID = targetIDForTextChangeEvent(
      topLevelType,
      topLevelTarget,
      topLevelTargetID
    );

    if (targetID) {
      var event = SyntheticEvent.getPooled(
        eventTypes.textChange,
        targetID,
        nativeEvent
      );
      EventPropagators.accumulateTwoPhaseDispatches(event);
      return event;
    }
  }

};

module.exports = TextChangeEventPlugin;
