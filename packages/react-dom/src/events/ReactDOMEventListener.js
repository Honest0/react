/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from 'legacy-events/PluginModuleType';
import type {Fiber} from 'react-reconciler/src/ReactFiber';
import type {FiberRoot} from 'react-reconciler/src/ReactFiberRoot';
import type {Container, SuspenseInstance} from '../client/ReactDOMHostConfig';
import type {DOMTopLevelEventType} from 'legacy-events/TopLevelEventTypes';

// Intentionally not named imports because Rollup would use dynamic dispatch for
// CommonJS interop named imports.
import * as Scheduler from 'scheduler';

import {
  batchedEventUpdates,
  discreteUpdates,
  flushDiscreteUpdatesIfNeeded,
} from 'legacy-events/ReactGenericBatching';
import {runExtractedPluginEventsInBatch} from 'legacy-events/EventPluginHub';
import {dispatchEventForResponderEventSystem} from './DOMEventResponderSystem';
import {
  isReplayableDiscreteEvent,
  queueDiscreteEvent,
  hasQueuedDiscreteEvents,
  clearIfContinuousEvent,
  queueIfContinuousEvent,
} from './ReactDOMEventReplaying';
import {
  getNearestMountedFiber,
  getContainerFromFiber,
  getSuspenseInstanceFromFiber,
} from 'react-reconciler/reflection';
import {
  HostRoot,
  SuspenseComponent,
  HostComponent,
  HostText,
} from 'shared/ReactWorkTags';
import {
  type EventSystemFlags,
  PLUGIN_EVENT_SYSTEM,
  RESPONDER_EVENT_SYSTEM,
  IS_PASSIVE,
  IS_ACTIVE,
  PASSIVE_NOT_SUPPORTED,
} from 'legacy-events/EventSystemFlags';

import {
  addEventBubbleListener,
  addEventCaptureListener,
  addEventCaptureListenerWithPassiveFlag,
} from './EventListener';
import getEventTarget from './getEventTarget';
import {getClosestInstanceFromNode} from '../client/ReactDOMComponentTree';
import SimpleEventPlugin from './SimpleEventPlugin';
import {getRawEventName} from './DOMTopLevelEventTypes';
import {passiveBrowserEventsSupported} from './checkPassiveEvents';

import {enableFlareAPI} from 'shared/ReactFeatureFlags';
import {
  UserBlockingEvent,
  ContinuousEvent,
  DiscreteEvent,
} from 'shared/ReactTypes';

const {
  unstable_UserBlockingPriority: UserBlockingPriority,
  unstable_runWithPriority: runWithPriority,
} = Scheduler;

const {getEventPriority} = SimpleEventPlugin;

const CALLBACK_BOOKKEEPING_POOL_SIZE = 10;
const callbackBookkeepingPool = [];

type BookKeepingInstance = {|
  topLevelType: DOMTopLevelEventType | null,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent | null,
  targetInst: Fiber | null,
  ancestors: Array<Fiber | null>,
|};

/**
 * Find the deepest React component completely containing the root of the
 * passed-in instance (for use when entire React trees are nested within each
 * other). If React trees are not nested, returns null.
 */
function findRootContainerNode(inst) {
  if (inst.tag === HostRoot) {
    return inst.stateNode.containerInfo;
  }
  // TODO: It may be a good idea to cache this to prevent unnecessary DOM
  // traversal, but caching is difficult to do correctly without using a
  // mutation observer to listen for all DOM changes.
  while (inst.return) {
    inst = inst.return;
  }
  if (inst.tag !== HostRoot) {
    // This can happen if we're in a detached tree.
    return null;
  }
  return inst.stateNode.containerInfo;
}

// Used to store ancestor hierarchy in top level callback
function getTopLevelCallbackBookKeeping(
  topLevelType: DOMTopLevelEventType,
  nativeEvent: AnyNativeEvent,
  targetInst: Fiber | null,
  eventSystemFlags: EventSystemFlags,
): BookKeepingInstance {
  if (callbackBookkeepingPool.length) {
    const instance = callbackBookkeepingPool.pop();
    instance.topLevelType = topLevelType;
    instance.eventSystemFlags = eventSystemFlags;
    instance.nativeEvent = nativeEvent;
    instance.targetInst = targetInst;
    return instance;
  }
  return {
    topLevelType,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    ancestors: [],
  };
}

function releaseTopLevelCallbackBookKeeping(
  instance: BookKeepingInstance,
): void {
  instance.topLevelType = null;
  instance.nativeEvent = null;
  instance.targetInst = null;
  instance.ancestors.length = 0;
  if (callbackBookkeepingPool.length < CALLBACK_BOOKKEEPING_POOL_SIZE) {
    callbackBookkeepingPool.push(instance);
  }
}

function handleTopLevel(bookKeeping: BookKeepingInstance) {
  let targetInst = bookKeeping.targetInst;

  // Loop through the hierarchy, in case there's any nested components.
  // It's important that we build the array of ancestors before calling any
  // event handlers, because event handlers can modify the DOM, leading to
  // inconsistencies with ReactMount's node cache. See #1105.
  let ancestor = targetInst;
  do {
    if (!ancestor) {
      const ancestors = bookKeeping.ancestors;
      ((ancestors: any): Array<Fiber | null>).push(ancestor);
      break;
    }
    const root = findRootContainerNode(ancestor);
    if (!root) {
      break;
    }
    const tag = ancestor.tag;
    if (tag === HostComponent || tag === HostText) {
      bookKeeping.ancestors.push(ancestor);
    }
    ancestor = getClosestInstanceFromNode(root);
  } while (ancestor);

  for (let i = 0; i < bookKeeping.ancestors.length; i++) {
    targetInst = bookKeeping.ancestors[i];
    const eventTarget = getEventTarget(bookKeeping.nativeEvent);
    const topLevelType = ((bookKeeping.topLevelType: any): DOMTopLevelEventType);
    const nativeEvent = ((bookKeeping.nativeEvent: any): AnyNativeEvent);

    runExtractedPluginEventsInBatch(
      topLevelType,
      bookKeeping.eventSystemFlags,
      targetInst,
      nativeEvent,
      eventTarget,
    );
  }
}

// TODO: can we stop exporting these?
export let _enabled = true;

export function setEnabled(enabled: ?boolean) {
  _enabled = !!enabled;
}

export function isEnabled() {
  return _enabled;
}

export function trapBubbledEvent(
  topLevelType: DOMTopLevelEventType,
  element: Document | Element | Node,
): void {
  trapEventForPluginEventSystem(element, topLevelType, false);
}

export function trapCapturedEvent(
  topLevelType: DOMTopLevelEventType,
  element: Document | Element | Node,
): void {
  trapEventForPluginEventSystem(element, topLevelType, true);
}

export function trapEventForResponderEventSystem(
  element: Document | Element | Node,
  topLevelType: DOMTopLevelEventType,
  passive: boolean,
): void {
  if (enableFlareAPI) {
    const rawEventName = getRawEventName(topLevelType);
    let eventFlags = RESPONDER_EVENT_SYSTEM;

    // If passive option is not supported, then the event will be
    // active and not passive, but we flag it as using not being
    // supported too. This way the responder event plugins know,
    // and can provide polyfills if needed.
    if (passive) {
      if (passiveBrowserEventsSupported) {
        eventFlags |= IS_PASSIVE;
      } else {
        eventFlags |= IS_ACTIVE;
        eventFlags |= PASSIVE_NOT_SUPPORTED;
        passive = false;
      }
    } else {
      eventFlags |= IS_ACTIVE;
    }
    // Check if interactive and wrap in discreteUpdates
    const listener = dispatchEvent.bind(null, topLevelType, eventFlags);
    if (passiveBrowserEventsSupported) {
      addEventCaptureListenerWithPassiveFlag(
        element,
        rawEventName,
        listener,
        passive,
      );
    } else {
      addEventCaptureListener(element, rawEventName, listener);
    }
  }
}

function trapEventForPluginEventSystem(
  element: Document | Element | Node,
  topLevelType: DOMTopLevelEventType,
  capture: boolean,
): void {
  let listener;
  switch (getEventPriority(topLevelType)) {
    case DiscreteEvent:
      listener = dispatchDiscreteEvent.bind(
        null,
        topLevelType,
        PLUGIN_EVENT_SYSTEM,
      );
      break;
    case UserBlockingEvent:
      listener = dispatchUserBlockingUpdate.bind(
        null,
        topLevelType,
        PLUGIN_EVENT_SYSTEM,
      );
      break;
    case ContinuousEvent:
    default:
      listener = dispatchEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM);
      break;
  }

  const rawEventName = getRawEventName(topLevelType);
  if (capture) {
    addEventCaptureListener(element, rawEventName, listener);
  } else {
    addEventBubbleListener(element, rawEventName, listener);
  }
}

function dispatchDiscreteEvent(topLevelType, eventSystemFlags, nativeEvent) {
  flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
  discreteUpdates(dispatchEvent, topLevelType, eventSystemFlags, nativeEvent);
}

function dispatchUserBlockingUpdate(
  topLevelType,
  eventSystemFlags,
  nativeEvent,
) {
  runWithPriority(
    UserBlockingPriority,
    dispatchEvent.bind(null, topLevelType, eventSystemFlags, nativeEvent),
  );
}

function dispatchEventForPluginEventSystem(
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: null | Fiber,
): void {
  const bookKeeping = getTopLevelCallbackBookKeeping(
    topLevelType,
    nativeEvent,
    targetInst,
    eventSystemFlags,
  );

  try {
    // Event queue being processed in the same cycle allows
    // `preventDefault`.
    batchedEventUpdates(handleTopLevel, bookKeeping);
  } finally {
    releaseTopLevelCallbackBookKeeping(bookKeeping);
  }
}

export function dispatchEvent(
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
): void {
  if (!_enabled) {
    return;
  }
  if (hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
    // If we already have a queue of discrete events, and this is another discrete
    // event, then we can't dispatch it regardless of its target, since they
    // need to dispatch in order.
    queueDiscreteEvent(
      null, // Flags that we're not actually blocked on anything as far as we know.
      topLevelType,
      eventSystemFlags,
      nativeEvent,
    );
    return;
  }

  const blockedOn = attemptToDispatchEvent(
    topLevelType,
    eventSystemFlags,
    nativeEvent,
  );

  if (blockedOn === null) {
    // We successfully dispatched this event.
    clearIfContinuousEvent(topLevelType, nativeEvent);
    return;
  }

  if (isReplayableDiscreteEvent(topLevelType)) {
    // This this to be replayed later once the target is available.
    queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent);
    return;
  }

  if (
    queueIfContinuousEvent(
      blockedOn,
      topLevelType,
      eventSystemFlags,
      nativeEvent,
    )
  ) {
    return;
  }

  // We need to clear only if we didn't queue because
  // queueing is accummulative.
  clearIfContinuousEvent(topLevelType, nativeEvent);

  // This is not replayable so we'll invoke it but without a target,
  // in case the event system needs to trace it.
  if (enableFlareAPI) {
    if (eventSystemFlags & PLUGIN_EVENT_SYSTEM) {
      dispatchEventForPluginEventSystem(
        topLevelType,
        eventSystemFlags,
        nativeEvent,
        null,
      );
    }
    if (eventSystemFlags & RESPONDER_EVENT_SYSTEM) {
      // React Flare event system
      dispatchEventForResponderEventSystem(
        (topLevelType: any),
        null,
        nativeEvent,
        getEventTarget(nativeEvent),
        eventSystemFlags,
      );
    }
  } else {
    dispatchEventForPluginEventSystem(
      topLevelType,
      eventSystemFlags,
      nativeEvent,
      null,
    );
  }
}

// Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.
export function attemptToDispatchEvent(
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
): null | Container | SuspenseInstance {
  // TODO: Warn if _enabled is false.

  const nativeEventTarget = getEventTarget(nativeEvent);
  let targetInst = getClosestInstanceFromNode(nativeEventTarget);

  if (targetInst !== null) {
    let nearestMounted = getNearestMountedFiber(targetInst);
    if (nearestMounted === null) {
      // This tree has been unmounted already. Dispatch without a target.
      targetInst = null;
    } else {
      const tag = nearestMounted.tag;
      if (tag === SuspenseComponent) {
        let instance = getSuspenseInstanceFromFiber(nearestMounted);
        if (instance !== null) {
          // Queue the event to be replayed later. Abort dispatching since we
          // don't want this event dispatched twice through the event system.
          // TODO: If this is the first discrete event in the queue. Schedule an increased
          // priority for this boundary.
          return instance;
        }
        // This shouldn't happen, something went wrong but to avoid blocking
        // the whole system, dispatch the event without a target.
        // TODO: Warn.
        targetInst = null;
      } else if (tag === HostRoot) {
        const root: FiberRoot = nearestMounted.stateNode;
        if (root.hydrate) {
          // If this happens during a replay something went wrong and it might block
          // the whole system.
          return getContainerFromFiber(nearestMounted);
        }
        targetInst = null;
      } else if (nearestMounted !== targetInst) {
        // If we get an event (ex: img onload) before committing that
        // component's mount, ignore it for now (that is, treat it as if it was an
        // event on a non-React tree). We might also consider queueing events and
        // dispatching them after the mount.
        targetInst = null;
      }
    }
  }

  if (enableFlareAPI) {
    if (eventSystemFlags & PLUGIN_EVENT_SYSTEM) {
      dispatchEventForPluginEventSystem(
        topLevelType,
        eventSystemFlags,
        nativeEvent,
        targetInst,
      );
    }
    if (eventSystemFlags & RESPONDER_EVENT_SYSTEM) {
      // React Flare event system
      dispatchEventForResponderEventSystem(
        (topLevelType: any),
        targetInst,
        nativeEvent,
        nativeEventTarget,
        eventSystemFlags,
      );
    }
  } else {
    dispatchEventForPluginEventSystem(
      topLevelType,
      eventSystemFlags,
      nativeEvent,
      targetInst,
    );
  }
  // We're not blocked on anything.
  return null;
}
