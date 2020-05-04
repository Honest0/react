/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from 'legacy-events/PluginModuleType';
import type {DOMTopLevelEventType} from 'legacy-events/TopLevelEventTypes';
import type {
  ElementListenerMap,
  ElementListenerMapEntry,
} from '../client/ReactDOMComponentTree';
import type {EventSystemFlags} from './EventSystemFlags';
import type {EventPriority} from 'shared/ReactTypes';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {
  ModernPluginModule,
  DispatchQueue,
  DispatchQueueItem,
  DispatchQueueItemPhase,
  DispatchQueueItemPhaseEntry,
} from 'legacy-events/PluginModuleType';
import type {ReactSyntheticEvent} from 'legacy-events/ReactSyntheticEventType';

import {registrationNameDependencies} from 'legacy-events/EventPluginRegistry';
import {plugins} from 'legacy-events/EventPluginRegistry';
import {
  PLUGIN_EVENT_SYSTEM,
  LEGACY_FB_SUPPORT,
  IS_REPLAYED,
  IS_TARGET_PHASE_ONLY,
  USE_EVENT_SYSTEM,
} from './EventSystemFlags';

import {
  HostRoot,
  HostPortal,
  HostComponent,
} from 'react-reconciler/src/ReactWorkTags';

import getEventTarget from './getEventTarget';
import {
  TOP_FOCUS,
  TOP_LOAD,
  TOP_ABORT,
  TOP_CANCEL,
  TOP_INVALID,
  TOP_BLUR,
  TOP_SCROLL,
  TOP_CLOSE,
  TOP_RESET,
  TOP_SUBMIT,
  TOP_CAN_PLAY,
  TOP_CAN_PLAY_THROUGH,
  TOP_DURATION_CHANGE,
  TOP_EMPTIED,
  TOP_ENCRYPTED,
  TOP_ENDED,
  TOP_ERROR,
  TOP_WAITING,
  TOP_VOLUME_CHANGE,
  TOP_TIME_UPDATE,
  TOP_SUSPEND,
  TOP_STALLED,
  TOP_SEEKING,
  TOP_SEEKED,
  TOP_PLAY,
  TOP_PAUSE,
  TOP_LOAD_START,
  TOP_LOADED_DATA,
  TOP_LOADED_METADATA,
  TOP_RATE_CHANGE,
  TOP_PROGRESS,
  TOP_PLAYING,
  TOP_CLICK,
  TOP_SELECTION_CHANGE,
  getRawEventName,
} from './DOMTopLevelEventTypes';
import {
  getClosestInstanceFromNode,
  getEventListenerMap,
} from '../client/ReactDOMComponentTree';
import {COMMENT_NODE} from '../shared/HTMLNodeType';
import {batchedEventUpdates} from './ReactDOMUpdateBatching';
import getListener from './getListener';
import {passiveBrowserEventsSupported} from './checkPassiveEvents';

import {enableLegacyFBSupport} from 'shared/ReactFeatureFlags';
import {
  invokeGuardedCallbackAndCatchFirstError,
  rethrowCaughtError,
} from 'shared/ReactErrorUtils';
import {createEventListenerWrapperWithPriority} from './ReactDOMEventListener';
import {
  removeEventListener,
  addEventCaptureListener,
  addEventBubbleListener,
} from './EventListener';

const capturePhaseEvents = new Set([
  TOP_FOCUS,
  TOP_BLUR,
  TOP_SCROLL,
  TOP_LOAD,
  TOP_ABORT,
  TOP_CANCEL,
  TOP_CLOSE,
  TOP_INVALID,
  TOP_RESET,
  TOP_SUBMIT,
  TOP_ABORT,
  TOP_CAN_PLAY,
  TOP_CAN_PLAY_THROUGH,
  TOP_DURATION_CHANGE,
  TOP_EMPTIED,
  TOP_ENCRYPTED,
  TOP_ENDED,
  TOP_ERROR,
  TOP_LOADED_DATA,
  TOP_LOADED_METADATA,
  TOP_LOAD_START,
  TOP_PAUSE,
  TOP_PLAY,
  TOP_PLAYING,
  TOP_PROGRESS,
  TOP_RATE_CHANGE,
  TOP_SEEKED,
  TOP_SEEKING,
  TOP_STALLED,
  TOP_SUSPEND,
  TOP_TIME_UPDATE,
  TOP_VOLUME_CHANGE,
  TOP_WAITING,
]);

function executeDispatch(
  event: ReactSyntheticEvent,
  listener: Function,
  currentTarget: EventTarget,
): void {
  const type = event.type || 'unknown-event';
  event.currentTarget = currentTarget;
  invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event);
  event.currentTarget = null;
}

function executeDispatchesInOrder(
  event: ReactSyntheticEvent,
  capture: DispatchQueueItemPhase,
  bubble: DispatchQueueItemPhase,
): void {
  let previousInstance;
  // Dispatch capture phase first.
  for (let i = capture.length - 1; i >= 0; i--) {
    const {instance, currentTarget, listener} = capture[i];
    if (instance !== previousInstance && event.isPropagationStopped()) {
      return;
    }
    executeDispatch(event, listener, currentTarget);
    previousInstance = instance;
  }
  previousInstance = undefined;
  // Dispatch bubble phase second.
  for (let i = 0; i < bubble.length; i++) {
    const {instance, currentTarget, listener} = bubble[i];
    if (instance !== previousInstance && event.isPropagationStopped()) {
      return;
    }
    executeDispatch(event, listener, currentTarget);
    previousInstance = instance;
  }
}

export function dispatchEventsInBatch(dispatchQueue: DispatchQueue): void {
  for (let i = 0; i < dispatchQueue.length; i++) {
    const dispatchQueueItem: DispatchQueueItem = dispatchQueue[i];
    const {event, capture, bubble} = dispatchQueueItem;
    executeDispatchesInOrder(event, capture, bubble);
    // Release the event from the pool if needed
    if (!event.isPersistent()) {
      event.constructor.release(event);
    }
  }
  // This would be a good time to rethrow if any of the event handlers threw.
  rethrowCaughtError();
}

function dispatchEventsForPlugins(
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: null | Fiber,
  targetContainer: EventTarget,
): void {
  const modernPlugins = ((plugins: any): Array<ModernPluginModule<Event>>);
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue: DispatchQueue = [];

  for (let i = 0; i < modernPlugins.length; i++) {
    const plugin = modernPlugins[i];
    plugin.extractEvents(
      dispatchQueue,
      topLevelType,
      targetInst,
      nativeEvent,
      nativeEventTarget,
      eventSystemFlags,
      targetContainer,
    );
  }
  dispatchEventsInBatch(dispatchQueue);
}

export function listenToTopLevelEvent(
  topLevelType: DOMTopLevelEventType,
  targetContainer: EventTarget,
  listenerMap: ElementListenerMap,
  eventSystemFlags: EventSystemFlags,
  passive?: boolean,
  priority?: EventPriority,
  capture?: boolean,
): void {
  // TOP_SELECTION_CHANGE needs to be attached to the document
  // otherwise it won't capture incoming events that are only
  // triggered on the document directly.
  if (topLevelType === TOP_SELECTION_CHANGE) {
    targetContainer = (targetContainer: any).ownerDocument || targetContainer;
    listenerMap = getEventListenerMap(targetContainer);
  }
  const listenerEntry: ElementListenerMapEntry | void = listenerMap.get(
    topLevelType,
  );
  const isCapturePhase =
    capture === undefined ? capturePhaseEvents.has(topLevelType) : capture;
  if (listenerEntry === undefined) {
    const listener = addTrappedEventListener(
      targetContainer,
      topLevelType,
      eventSystemFlags,
      isCapturePhase,
      false,
      passive,
      priority,
    );
    listenerMap.set(topLevelType, {passive, listener});
  }
}

export function listenToEvent(
  registrationName: string,
  rootContainerElement: Element,
): void {
  const listenerMap = getEventListenerMap(rootContainerElement);
  const dependencies = registrationNameDependencies[registrationName];

  for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];
    listenToTopLevelEvent(
      dependency,
      rootContainerElement,
      listenerMap,
      PLUGIN_EVENT_SYSTEM,
    );
  }
}

function addTrappedEventListener(
  targetContainer: EventTarget,
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  capture: boolean,
  isDeferredListenerForLegacyFBSupport?: boolean,
  passive?: boolean,
  priority?: EventPriority,
): any => void {
  let listener = createEventListenerWrapperWithPriority(
    targetContainer,
    topLevelType,
    eventSystemFlags,
    priority,
  );
  // If passive option is not supported, then the event will be
  // active and not passive.
  if (passive === true && !passiveBrowserEventsSupported) {
    passive = false;
  }

  targetContainer =
    enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport
      ? (targetContainer: any).ownerDocument
      : targetContainer;

  const rawEventName = getRawEventName(topLevelType);

  let unsubscribeListener;
  // When legacyFBSupport is enabled, it's for when we
  // want to add a one time event listener to a container.
  // This should only be used with enableLegacyFBSupport
  // due to requirement to provide compatibility with
  // internal FB www event tooling. This works by removing
  // the event listener as soon as it is invoked. We could
  // also attempt to use the {once: true} param on
  // addEventListener, but that requires support and some
  // browsers do not support this today, and given this is
  // to support legacy code patterns, it's likely they'll
  // need support for such browsers.
  if (enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport) {
    const originalListener = listener;
    listener = function(...p) {
      try {
        return originalListener.apply(this, p);
      } finally {
        removeEventListener(
          targetContainer,
          rawEventName,
          unsubscribeListener,
          capture,
        );
      }
    };
  }
  if (capture) {
    unsubscribeListener = addEventCaptureListener(
      targetContainer,
      rawEventName,
      listener,
    );
  } else {
    unsubscribeListener = addEventBubbleListener(
      targetContainer,
      rawEventName,
      listener,
    );
  }
  return unsubscribeListener;
}

function willDeferLaterForLegacyFBSupport(
  topLevelType: DOMTopLevelEventType,
  targetContainer: EventTarget,
): boolean {
  if (topLevelType !== TOP_CLICK) {
    return false;
  }
  // We defer all click events with legacy FB support mode on.
  // This means we add a one time event listener to trigger
  // after the FB delegated listeners fire.
  const isDeferredListenerForLegacyFBSupport = true;
  addTrappedEventListener(
    targetContainer,
    topLevelType,
    PLUGIN_EVENT_SYSTEM | LEGACY_FB_SUPPORT,
    false,
    isDeferredListenerForLegacyFBSupport,
  );
  return true;
}

function isMatchingRootContainer(
  grandContainer: Element,
  targetContainer: EventTarget,
): boolean {
  return (
    grandContainer === targetContainer ||
    (grandContainer.nodeType === COMMENT_NODE &&
      grandContainer.parentNode === targetContainer)
  );
}

export function dispatchEventForPluginEventSystem(
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: null | Fiber,
  targetContainer: EventTarget,
): void {
  let ancestorInst = targetInst;
  if (eventSystemFlags & IS_TARGET_PHASE_ONLY) {
    // For TargetEvent nodes (i.e. document, window)
    ancestorInst = null;
  } else {
    const targetContainerNode = ((targetContainer: any): Node);

    // If we are using the legacy FB support flag, we
    // defer the event to the null with a one
    // time event listener so we can defer the event.
    if (
      enableLegacyFBSupport &&
      // We do not want to defer if the event system has already been
      // set to LEGACY_FB_SUPPORT. LEGACY_FB_SUPPORT only gets set when
      // we call willDeferLaterForLegacyFBSupport, thus not bailing out
      // will result in endless cycles like an infinite loop.
      (eventSystemFlags & LEGACY_FB_SUPPORT) === 0 &&
      // We also don't want to defer during event replaying.
      (eventSystemFlags & IS_REPLAYED) === 0 &&
      // We don't want to apply the legacy FB support for the useEvent API.
      (eventSystemFlags & USE_EVENT_SYSTEM) === 0 &&
      willDeferLaterForLegacyFBSupport(topLevelType, targetContainer)
    ) {
      return;
    }
    if (targetInst !== null) {
      // The below logic attempts to work out if we need to change
      // the target fiber to a different ancestor. We had similar logic
      // in the legacy event system, except the big difference between
      // systems is that the modern event system now has an event listener
      // attached to each React Root and React Portal Root. Together,
      // the DOM nodes representing these roots are the "rootContainer".
      // To figure out which ancestor instance we should use, we traverse
      // up the fiber tree from the target instance and attempt to find
      // root boundaries that match that of our current "rootContainer".
      // If we find that "rootContainer", we find the parent fiber
      // sub-tree for that root and make that our ancestor instance.
      let node = targetInst;

      while (true) {
        if (node === null) {
          return;
        }
        if (node.tag === HostRoot || node.tag === HostPortal) {
          const container = node.stateNode.containerInfo;
          if (isMatchingRootContainer(container, targetContainerNode)) {
            break;
          }
          if (node.tag === HostPortal) {
            // The target is a portal, but it's not the rootContainer we're looking for.
            // Normally portals handle their own events all the way down to the root.
            // So we should be able to stop now. However, we don't know if this portal
            // was part of *our* root.
            let grandNode = node.return;
            while (grandNode !== null) {
              if (grandNode.tag === HostRoot || grandNode.tag === HostPortal) {
                const grandContainer = grandNode.stateNode.containerInfo;
                if (
                  isMatchingRootContainer(grandContainer, targetContainerNode)
                ) {
                  // This is the rootContainer we're looking for and we found it as
                  // a parent of the Portal. That means we can ignore it because the
                  // Portal will bubble through to us.
                  return;
                }
              }
              grandNode = grandNode.return;
            }
          }
          const parentSubtreeInst = getClosestInstanceFromNode(container);
          if (parentSubtreeInst === null) {
            return;
          }
          node = ancestorInst = parentSubtreeInst;
          continue;
        }
        node = node.return;
      }
    }
  }

  batchedEventUpdates(() =>
    dispatchEventsForPlugins(
      topLevelType,
      eventSystemFlags,
      nativeEvent,
      ancestorInst,
      targetContainer,
    ),
  );
}

function createDispatchQueueItemPhaseEntry(
  instance: null | Fiber,
  listener: Function,
  currentTarget: EventTarget,
): DispatchQueueItemPhaseEntry {
  return {
    instance,
    listener,
    currentTarget,
  };
}

function createDispatchQueueItem(
  event: ReactSyntheticEvent,
  capture: DispatchQueueItemPhase,
  bubble: DispatchQueueItemPhase,
): DispatchQueueItem {
  return {
    event,
    capture,
    bubble,
  };
}

export function accumulateTwoPhaseListeners(
  targetFiber: Fiber | null,
  dispatchQueue: DispatchQueue,
  event: ReactSyntheticEvent,
): void {
  const phasedRegistrationNames = event.dispatchConfig.phasedRegistrationNames;
  const capturePhase: DispatchQueueItemPhase = [];
  const bubblePhase: DispatchQueueItemPhase = [];

  const {bubbled, captured} = phasedRegistrationNames;
  // If we are not handling EventTarget only phase, then we're doing the
  // usual two phase accumulation using the React fiber tree to pick up
  // all relevant useEvent and on* prop events.
  let instance = targetFiber;

  // Accumulate all instances and listeners via the target -> root path.
  while (instance !== null) {
    const {stateNode, tag} = instance;
    // Handle listeners that are on HostComponents (i.e. <div>)
    if (tag === HostComponent && stateNode !== null) {
      const currentTarget = stateNode;
      // Standard React on* listeners, i.e. onClick prop
      if (captured !== null) {
        const captureListener = getListener(instance, captured);
        if (captureListener != null) {
          capturePhase.push(
            createDispatchQueueItemPhaseEntry(
              instance,
              captureListener,
              currentTarget,
            ),
          );
        }
      }
      if (bubbled !== null) {
        const bubbleListener = getListener(instance, bubbled);
        if (bubbleListener != null) {
          bubblePhase.push(
            createDispatchQueueItemPhaseEntry(
              instance,
              bubbleListener,
              currentTarget,
            ),
          );
        }
      }
    }
    instance = instance.return;
  }
  if (capturePhase.length !== 0 || bubblePhase.length !== 0) {
    dispatchQueue.push(
      createDispatchQueueItem(event, capturePhase, bubblePhase),
    );
  }
}

function getParent(inst: Fiber | null): Fiber | null {
  if (inst === null) {
    return null;
  }
  do {
    inst = inst.return;
    // TODO: If this is a HostRoot we might want to bail out.
    // That is depending on if we want nested subtrees (layers) to bubble
    // events to their parent. We could also go through parentNode on the
    // host node but that wouldn't work for React Native and doesn't let us
    // do the portal feature.
  } while (inst && inst.tag !== HostComponent);
  if (inst) {
    return inst;
  }
  return null;
}

/**
 * Return the lowest common ancestor of A and B, or null if they are in
 * different trees.
 */
function getLowestCommonAncestor(instA: Fiber, instB: Fiber): Fiber | null {
  let nodeA = instA;
  let nodeB = instB;
  let depthA = 0;
  for (let tempA = nodeA; tempA; tempA = getParent(tempA)) {
    depthA++;
  }
  let depthB = 0;
  for (let tempB = nodeB; tempB; tempB = getParent(tempB)) {
    depthB++;
  }

  // If A is deeper, crawl up.
  while (depthA - depthB > 0) {
    nodeA = getParent(nodeA);
    depthA--;
  }

  // If B is deeper, crawl up.
  while (depthB - depthA > 0) {
    nodeB = getParent(nodeB);
    depthB--;
  }

  // Walk in lockstep until we find a match.
  let depth = depthA;
  while (depth--) {
    if (nodeA === nodeB || (nodeB !== null && nodeA === nodeB.alternate)) {
      return nodeA;
    }
    nodeA = getParent(nodeA);
    nodeB = getParent(nodeB);
  }
  return null;
}

function accumulateEnterLeaveListenersForEvent(
  dispatchQueue: DispatchQueue,
  event: ReactSyntheticEvent,
  target: Fiber,
  common: Fiber | null,
  capture: boolean,
): void {
  const registrationName = event.dispatchConfig.registrationName;
  if (registrationName === undefined) {
    return;
  }
  const capturePhase: DispatchQueueItemPhase = [];
  const bubblePhase: DispatchQueueItemPhase = [];

  let instance = target;
  while (instance !== null) {
    if (instance === common) {
      break;
    }
    const {alternate, stateNode, tag} = instance;
    if (alternate !== null && alternate === common) {
      break;
    }
    if (tag === HostComponent && stateNode !== null) {
      const currentTarget = stateNode;
      if (capture) {
        const captureListener = getListener(instance, registrationName);
        if (captureListener != null) {
          capturePhase.push(
            createDispatchQueueItemPhaseEntry(
              instance,
              captureListener,
              currentTarget,
            ),
          );
        }
      } else {
        const bubbleListener = getListener(instance, registrationName);
        if (bubbleListener != null) {
          bubblePhase.push(
            createDispatchQueueItemPhaseEntry(
              instance,
              bubbleListener,
              currentTarget,
            ),
          );
        }
      }
    }
    instance = instance.return;
  }
  if (capturePhase.length !== 0 || bubblePhase.length !== 0) {
    dispatchQueue.push(
      createDispatchQueueItem(event, capturePhase, bubblePhase),
    );
  }
}

export function accumulateEnterLeaveListeners(
  dispatchQueue: DispatchQueue,
  leaveEvent: ReactSyntheticEvent,
  enterEvent: ReactSyntheticEvent,
  from: Fiber | null,
  to: Fiber | null,
): void {
  const common = from && to ? getLowestCommonAncestor(from, to) : null;

  if (from !== null) {
    accumulateEnterLeaveListenersForEvent(
      dispatchQueue,
      leaveEvent,
      from,
      common,
      false,
    );
  }
  if (to !== null) {
    accumulateEnterLeaveListenersForEvent(
      dispatchQueue,
      enterEvent,
      to,
      common,
      true,
    );
  }
}
