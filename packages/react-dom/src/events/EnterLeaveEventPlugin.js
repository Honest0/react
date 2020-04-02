/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  TOP_MOUSE_OUT,
  TOP_MOUSE_OVER,
  TOP_POINTER_OUT,
  TOP_POINTER_OVER,
} from './DOMTopLevelEventTypes';
import {
  IS_REPLAYED,
  IS_FIRST_ANCESTOR,
} from 'react-dom/src/events/EventSystemFlags';
import SyntheticMouseEvent from './SyntheticMouseEvent';
import SyntheticPointerEvent from './SyntheticPointerEvent';
import {
  getClosestInstanceFromNode,
  getNodeFromInstance,
} from '../client/ReactDOMComponentTree';
import {HostComponent, HostText} from 'react-reconciler/src/ReactWorkTags';
import {getNearestMountedFiber} from 'react-reconciler/src/ReactFiberTreeReflection';
import {enableModernEventSystem} from 'shared/ReactFeatureFlags';
import accumulateEnterLeaveListeners from './accumulateEnterLeaveListeners';

const eventTypes = {
  mouseEnter: {
    registrationName: 'onMouseEnter',
    dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER],
  },
  mouseLeave: {
    registrationName: 'onMouseLeave',
    dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER],
  },
  pointerEnter: {
    registrationName: 'onPointerEnter',
    dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER],
  },
  pointerLeave: {
    registrationName: 'onPointerLeave',
    dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER],
  },
};

const EnterLeaveEventPlugin = {
  eventTypes: eventTypes,

  /**
   * For almost every interaction we care about, there will be both a top-level
   * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
   * we do not extract duplicate events. However, moving the mouse into the
   * browser from outside will not fire a `mouseout` event. In this case, we use
   * the `mouseover` top-level event.
   */
  extractEvents: function(
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
  ) {
    const isOverEvent =
      topLevelType === TOP_MOUSE_OVER || topLevelType === TOP_POINTER_OVER;
    const isOutEvent =
      topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_POINTER_OUT;

    if (isOverEvent && (eventSystemFlags & IS_REPLAYED) === 0) {
      const related = nativeEvent.relatedTarget || nativeEvent.fromElement;
      if (related) {
        if (enableModernEventSystem) {
          // Due to the fact we don't add listeners to the document with the
          // modern event system and instead attach listeners to roots, we
          // need to handle the over event case. To ensure this, we just need to
          // make sure the node that we're coming from is managed by React.
          const inst = getClosestInstanceFromNode(related);
          if (inst !== null) {
            return null;
          }
        } else {
          // If this is an over event with a target, then we've already dispatched
          // the event in the out event of the other target. If this is replayed,
          // then it's because we couldn't dispatch against this target previously
          // so we have to do it now instead.
          return null;
        }
      }
    }

    if (!isOutEvent && !isOverEvent) {
      // Must not be a mouse or pointer in or out - ignoring.
      return null;
    }

    let win;
    if (nativeEventTarget.window === nativeEventTarget) {
      // `nativeEventTarget` is probably a window object.
      win = nativeEventTarget;
    } else {
      // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
      const doc = nativeEventTarget.ownerDocument;
      if (doc) {
        win = doc.defaultView || doc.parentWindow;
      } else {
        win = window;
      }
    }

    let from;
    let to;
    if (isOutEvent) {
      from = targetInst;
      const related = nativeEvent.relatedTarget || nativeEvent.toElement;
      to = related ? getClosestInstanceFromNode(related) : null;
      if (to !== null) {
        const nearestMounted = getNearestMountedFiber(to);
        if (
          to !== nearestMounted ||
          (to.tag !== HostComponent && to.tag !== HostText)
        ) {
          to = null;
        }
      }
    } else {
      // Moving to a node from outside the window.
      from = null;
      to = targetInst;
    }

    if (from === to) {
      // Nothing pertains to our managed components.
      return null;
    }

    let eventInterface, leaveEventType, enterEventType, eventTypePrefix;

    if (topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_MOUSE_OVER) {
      eventInterface = SyntheticMouseEvent;
      leaveEventType = eventTypes.mouseLeave;
      enterEventType = eventTypes.mouseEnter;
      eventTypePrefix = 'mouse';
    } else if (
      topLevelType === TOP_POINTER_OUT ||
      topLevelType === TOP_POINTER_OVER
    ) {
      eventInterface = SyntheticPointerEvent;
      leaveEventType = eventTypes.pointerLeave;
      enterEventType = eventTypes.pointerEnter;
      eventTypePrefix = 'pointer';
    }

    const fromNode = from == null ? win : getNodeFromInstance(from);
    const toNode = to == null ? win : getNodeFromInstance(to);

    const leave = eventInterface.getPooled(
      leaveEventType,
      from,
      nativeEvent,
      nativeEventTarget,
    );
    leave.type = eventTypePrefix + 'leave';
    leave.target = fromNode;
    leave.relatedTarget = toNode;

    const enter = eventInterface.getPooled(
      enterEventType,
      to,
      nativeEvent,
      nativeEventTarget,
    );
    enter.type = eventTypePrefix + 'enter';
    enter.target = toNode;
    enter.relatedTarget = fromNode;

    accumulateEnterLeaveListeners(leave, enter, from, to);

    if (!enableModernEventSystem) {
      // If we are not processing the first ancestor, then we
      // should not process the same nativeEvent again, as we
      // will have already processed it in the first ancestor.
      if ((eventSystemFlags & IS_FIRST_ANCESTOR) === 0) {
        return [leave];
      }
    }

    return [leave, enter];
  },
};

export default EnterLeaveEventPlugin;
