/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @flow
 */

import {
  type EventSystemFlags,
  IS_PASSIVE,
  PASSIVE_NOT_SUPPORTED,
} from 'events/EventSystemFlags';
import type {AnyNativeEvent} from 'events/PluginModuleType';
import {
  EventComponent,
  EventTarget as EventTargetWorkTag,
  HostComponent,
} from 'shared/ReactWorkTags';
import type {
  ReactEventResponder,
  ReactEventResponderEventType,
  ReactEventComponentInstance,
  ReactResponderContext,
  ReactResponderEvent,
  ReactResponderDispatchEventOptions,
} from 'shared/ReactTypes';
import type {DOMTopLevelEventType} from 'events/TopLevelEventTypes';
import {batchedUpdates, interactiveUpdates} from 'events/ReactGenericBatching';
import type {Fiber} from 'react-reconciler/src/ReactFiber';
import warning from 'shared/warning';
import {enableEventAPI} from 'shared/ReactFeatureFlags';
import {invokeGuardedCallbackAndCatchFirstError} from 'shared/ReactErrorUtils';
import invariant from 'shared/invariant';

import {getClosestInstanceFromNode} from '../client/ReactDOMComponentTree';

export let listenToResponderEventTypesImpl;

export function setListenToResponderEventTypes(
  _listenToResponderEventTypesImpl: Function,
) {
  listenToResponderEventTypesImpl = _listenToResponderEventTypesImpl;
}

type EventObjectType = $Shape<PartialEventObject>;

type EventQueue = {
  events: Array<EventObjectType>,
  discrete: boolean,
};

type PartialEventObject = {
  target: Element | Document,
  type: string,
};

type ResponderTimeout = {|
  id: TimeoutID,
  timers: Map<Symbol, ResponderTimer>,
|};

type ResponderTimer = {|
  instance: ReactEventComponentInstance,
  func: () => void,
  id: Symbol,
|};

const activeTimeouts: Map<Symbol, ResponderTimeout> = new Map();
const rootEventTypesToEventComponentInstances: Map<
  DOMTopLevelEventType | string,
  Set<ReactEventComponentInstance>,
> = new Map();
const targetEventTypeCached: Map<
  Array<ReactEventResponderEventType>,
  Set<string>,
> = new Map();
const ownershipChangeListeners: Set<ReactEventComponentInstance> = new Set();
const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
const eventListeners:
  | WeakMap
  | Map<
      $Shape<PartialEventObject>,
      ($Shape<PartialEventObject>) => void,
    > = new PossiblyWeakMap();

const responderOwners: Map<
  ReactEventResponder,
  ReactEventComponentInstance,
> = new Map();
let globalOwner = null;

let currentTimers = new Map();
let currentInstance: null | ReactEventComponentInstance = null;
let currentEventQueue: null | EventQueue = null;

const eventResponderContext: ReactResponderContext = {
  dispatchEvent(
    possibleEventObject: Object,
    listener: ($Shape<PartialEventObject>) => void,
    {discrete}: ReactResponderDispatchEventOptions,
  ): void {
    validateResponderContext();
    const {target, type} = possibleEventObject;

    if (target == null || type == null) {
      throw new Error(
        'context.dispatchEvent: "target" and "type" fields on event object are required.',
      );
    }
    if (__DEV__) {
      possibleEventObject.preventDefault = () => {
        // Update this warning when we have a story around dealing with preventDefault
        warning(
          false,
          'preventDefault() is no longer available on event objects created from event responder modules.',
        );
      };
      possibleEventObject.stopPropagation = () => {
        // Update this warning when we have a story around dealing with stopPropgation
        warning(
          false,
          'stopPropagation() is no longer available on event objects created from event responder modules.',
        );
      };
    }
    const eventObject = ((possibleEventObject: any): $Shape<
      PartialEventObject,
    >);
    const eventQueue = ((currentEventQueue: any): EventQueue);
    if (discrete) {
      eventQueue.discrete = true;
    }
    eventListeners.set(eventObject, listener);
    eventQueue.events.push(eventObject);
  },
  isPositionWithinTouchHitTarget(x: number, y: number): boolean {
    validateResponderContext();
    const doc = getActiveDocument();
    // This isn't available in some environments (JSDOM)
    if (typeof doc.elementFromPoint !== 'function') {
      return false;
    }
    const target = doc.elementFromPoint(x, y);
    if (target === null) {
      return false;
    }
    const childFiber = getClosestInstanceFromNode(target);
    if (childFiber === null) {
      return false;
    }
    const parentFiber = childFiber.return;
    if (parentFiber !== null && parentFiber.tag === EventTargetWorkTag) {
      const parentNode = ((target.parentNode: any): Element);
      // TODO find another way to do this without using the
      // expensive getBoundingClientRect.
      const {left, top, right, bottom} = parentNode.getBoundingClientRect();
      // Check if the co-ords intersect with the target element's rect.
      if (x > left && y > top && x < right && y < bottom) {
        return false;
      }
      return true;
    }
    return false;
  },
  isTargetWithinEventComponent(target: Element | Document): boolean {
    validateResponderContext();
    if (target != null) {
      let fiber = getClosestInstanceFromNode(target);
      while (fiber !== null) {
        if (fiber.stateNode === currentInstance) {
          return true;
        }
        fiber = fiber.return;
      }
    }
    return false;
  },
  isTargetDirectlyWithinEventComponent(target: Element | Document): boolean {
    validateResponderContext();
    if (target != null) {
      let fiber = getClosestInstanceFromNode(target);
      while (fiber !== null) {
        if (fiber.stateNode === currentInstance) {
          return true;
        }
        if (fiber.tag === EventComponent) {
          return false;
        }
        fiber = fiber.return;
      }
    }
    return false;
  },
  isTargetWithinEventResponderScope(target: Element | Document): boolean {
    validateResponderContext();
    const responder = ((currentInstance: any): ReactEventComponentInstance)
      .responder;
    if (target != null) {
      let fiber = getClosestInstanceFromNode(target);
      while (fiber !== null) {
        if (fiber.stateNode === currentInstance) {
          return true;
        }
        if (
          fiber.tag === EventComponent &&
          fiber.stateNode.responder === responder
        ) {
          return false;
        }
        fiber = fiber.return;
      }
    }
    return false;
  },
  isTargetWithinElement(
    childTarget: Element | Document,
    parentTarget: Element | Document,
  ): boolean {
    const childFiber = getClosestInstanceFromNode(childTarget);
    const parentFiber = getClosestInstanceFromNode(parentTarget);

    let node = childFiber;
    while (node !== null) {
      if (node === parentFiber) {
        return true;
      }
      node = node.return;
    }
    return false;
  },
  addRootEventTypes(rootEventTypes: Array<ReactEventResponderEventType>): void {
    validateResponderContext();
    const activeDocument = getActiveDocument();
    listenToResponderEventTypesImpl(rootEventTypes, activeDocument);
    for (let i = 0; i < rootEventTypes.length; i++) {
      const rootEventType = rootEventTypes[i];
      const eventComponentInstance = ((currentInstance: any): ReactEventComponentInstance);
      registerRootEventType(rootEventType, eventComponentInstance);
    }
  },
  removeRootEventTypes(
    rootEventTypes: Array<ReactEventResponderEventType>,
  ): void {
    validateResponderContext();
    for (let i = 0; i < rootEventTypes.length; i++) {
      const rootEventType = rootEventTypes[i];
      let name = rootEventType;
      let passive = true;

      if (typeof rootEventType !== 'string') {
        const targetEventConfigObject = ((rootEventType: any): {
          name: string,
          passive?: boolean,
        });
        name = targetEventConfigObject.name;
        if (targetEventConfigObject.passive !== undefined) {
          passive = targetEventConfigObject.passive;
        }
      }

      const listeningName = generateListeningKey(
        ((name: any): string),
        passive,
      );
      let rootEventComponents = rootEventTypesToEventComponentInstances.get(
        listeningName,
      );
      let rootEventTypesSet = ((currentInstance: any): ReactEventComponentInstance)
        .rootEventTypes;
      if (rootEventTypesSet !== null) {
        rootEventTypesSet.delete(listeningName);
      }
      if (rootEventComponents !== undefined) {
        rootEventComponents.delete(
          ((currentInstance: any): ReactEventComponentInstance),
        );
      }
    }
  },
  hasOwnership(): boolean {
    validateResponderContext();
    const responder = ((currentInstance: any): ReactEventComponentInstance)
      .responder;
    return (
      globalOwner === currentInstance ||
      responderOwners.get(responder) === currentInstance
    );
  },
  requestGlobalOwnership(): boolean {
    validateResponderContext();
    if (globalOwner !== null) {
      return false;
    }
    globalOwner = currentInstance;
    triggerOwnershipListeners(null);
    return true;
  },
  requestResponderOwnership(): boolean {
    validateResponderContext();
    const eventComponentInstance = ((currentInstance: any): ReactEventComponentInstance);
    const responder = eventComponentInstance.responder;
    if (responderOwners.has(responder)) {
      return false;
    }
    responderOwners.set(responder, eventComponentInstance);
    triggerOwnershipListeners(responder);
    return true;
  },
  releaseOwnership(): boolean {
    validateResponderContext();
    return releaseOwnershipForEventComponentInstance(
      ((currentInstance: any): ReactEventComponentInstance),
    );
  },
  setTimeout(func: () => void, delay): Symbol {
    validateResponderContext();
    if (currentTimers === null) {
      currentTimers = new Map();
    }
    let timeout = currentTimers.get(delay);

    const timerId = Symbol();
    if (timeout === undefined) {
      const timers = new Map();
      const id = setTimeout(() => {
        processTimers(timers);
      }, delay);
      timeout = {
        id,
        timers,
      };
      currentTimers.set(delay, timeout);
    }
    timeout.timers.set(timerId, {
      instance: ((currentInstance: any): ReactEventComponentInstance),
      func,
      id: timerId,
    });
    activeTimeouts.set(timerId, timeout);
    return timerId;
  },
  clearTimeout(timerId: Symbol): void {
    validateResponderContext();
    const timeout = activeTimeouts.get(timerId);

    if (timeout !== undefined) {
      const timers = timeout.timers;
      timers.delete(timerId);
      if (timers.size === 0) {
        clearTimeout(timeout.id);
      }
    }
  },
  getFocusableElementsInScope(): Array<HTMLElement> {
    const focusableElements = [];
    const eventComponentInstance = ((currentInstance: any): ReactEventComponentInstance);
    let node = ((eventComponentInstance.currentFiber: any): Fiber).child;

    while (node !== null) {
      if (isFiberHostComponentFocusable(node)) {
        focusableElements.push(node.stateNode);
      } else {
        const child = node.child;

        if (child !== null) {
          node = child;
          continue;
        }
      }
      const sibling = node.sibling;

      if (sibling !== null) {
        node = sibling;
        continue;
      }
      const parent = node.return;
      if (parent === null) {
        break;
      }
      if (parent.stateNode === currentInstance) {
        break;
      }
      node = parent.sibling;
    }

    return focusableElements;
  },
  getActiveDocument,
};

function getActiveDocument(): Document {
  const eventComponentInstance = ((currentInstance: any): ReactEventComponentInstance);
  const rootElement = ((eventComponentInstance.rootInstance: any): Element);
  return rootElement.ownerDocument;
}

function releaseOwnershipForEventComponentInstance(
  eventComponentInstance: ReactEventComponentInstance,
): boolean {
  const responder = eventComponentInstance.responder;
  let triggerOwnershipListenersWith;
  if (responderOwners.get(responder) === eventComponentInstance) {
    responderOwners.delete(responder);
    triggerOwnershipListenersWith = responder;
  }
  if (globalOwner === eventComponentInstance) {
    globalOwner = null;
    triggerOwnershipListenersWith = null;
  }
  if (triggerOwnershipListenersWith !== undefined) {
    triggerOwnershipListeners(triggerOwnershipListenersWith);
    return true;
  } else {
    return false;
  }
}

function isFiberHostComponentFocusable(fiber: Fiber): boolean {
  if (fiber.tag !== HostComponent) {
    return false;
  }
  const {type, memoizedProps} = fiber;
  if (memoizedProps.tabIndex === -1 || memoizedProps.disabled) {
    return false;
  }
  if (memoizedProps.tabIndex === 0 || memoizedProps.contentEditable === true) {
    return true;
  }
  if (type === 'a' || type === 'area') {
    return !!memoizedProps.href && memoizedProps.rel !== 'ignore';
  }
  if (type === 'input') {
    return memoizedProps.type !== 'hidden' && memoizedProps.type !== 'file';
  }
  return (
    type === 'button' ||
    type === 'textarea' ||
    type === 'object' ||
    type === 'select' ||
    type === 'iframe' ||
    type === 'embed'
  );
}

function processTimers(timers: Map<Symbol, ResponderTimer>): void {
  const timersArr = Array.from(timers.values());
  currentEventQueue = createEventQueue();
  try {
    for (let i = 0; i < timersArr.length; i++) {
      const {instance, func, id} = timersArr[i];
      currentInstance = instance;
      try {
        func();
      } finally {
        activeTimeouts.delete(id);
      }
    }
    processEventQueue();
  } finally {
    currentTimers = null;
    currentInstance = null;
    currentEventQueue = null;
  }
}

function createResponderEvent(
  topLevelType: string,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: Element | Document,
  passive: boolean,
  passiveSupported: boolean,
): ReactResponderEvent {
  const responderEvent = {
    nativeEvent: nativeEvent,
    target: nativeEventTarget,
    type: topLevelType,
    passive,
    passiveSupported,
  };
  if (__DEV__) {
    Object.freeze(responderEvent);
  }
  return responderEvent;
}

function createEventQueue(): EventQueue {
  return {
    events: [],
    discrete: false,
  };
}

function processEvent(event: $Shape<PartialEventObject>): void {
  const type = event.type;
  const listener = ((eventListeners.get(event): any): (
    $Shape<PartialEventObject>,
  ) => void);
  invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event);
}

function processEvents(events: Array<EventObjectType>): void {
  for (let i = 0, length = events.length; i < length; i++) {
    processEvent(events[i]);
  }
}

export function processEventQueue(): void {
  const {events, discrete} = ((currentEventQueue: any): EventQueue);

  if (events.length === 0) {
    return;
  }
  if (discrete) {
    interactiveUpdates(() => {
      batchedUpdates(processEvents, events);
    });
  } else {
    batchedUpdates(processEvents, events);
  }
}

function getTargetEventTypesSet(
  eventTypes: Array<ReactEventResponderEventType>,
): Set<string> {
  let cachedSet = targetEventTypeCached.get(eventTypes);

  if (cachedSet === undefined) {
    cachedSet = new Set();
    for (let i = 0; i < eventTypes.length; i++) {
      const eventType = eventTypes[i];
      let name = eventType;
      let passive = true;

      if (typeof eventType !== 'string') {
        const targetEventConfigObject = ((eventType: any): {
          name: string,
          passive?: boolean,
        });
        name = targetEventConfigObject.name;
        if (targetEventConfigObject.passive !== undefined) {
          passive = targetEventConfigObject.passive;
        }
      }
      const listeningName = generateListeningKey(
        ((name: any): string),
        passive,
      );
      cachedSet.add(listeningName);
    }
    targetEventTypeCached.set(eventTypes, cachedSet);
  }
  return cachedSet;
}

function getTargetEventResponderInstances(
  listeningName: string,
  targetFiber: null | Fiber,
): Array<ReactEventComponentInstance> {
  const eventResponderInstances = [];
  let node = targetFiber;
  while (node !== null) {
    // Traverse up the fiber tree till we find event component fibers.
    if (node.tag === EventComponent) {
      const eventComponentInstance = node.stateNode;
      const responder = eventComponentInstance.responder;
      const targetEventTypes = responder.targetEventTypes;
      // Validate the target event type exists on the responder
      if (targetEventTypes !== undefined) {
        const targetEventTypesSet = getTargetEventTypesSet(targetEventTypes);
        if (targetEventTypesSet.has(listeningName)) {
          eventResponderInstances.push(eventComponentInstance);
        }
      }
    }
    node = node.return;
  }
  return eventResponderInstances;
}

function getRootEventResponderInstances(
  listeningName: string,
): Array<ReactEventComponentInstance> {
  const eventResponderInstances = [];
  const rootEventInstances = rootEventTypesToEventComponentInstances.get(
    listeningName,
  );
  if (rootEventInstances !== undefined) {
    const rootEventComponentInstances = Array.from(rootEventInstances);

    for (let i = 0; i < rootEventComponentInstances.length; i++) {
      const rootEventComponentInstance = rootEventComponentInstances[i];
      eventResponderInstances.push(rootEventComponentInstance);
    }
  }
  return eventResponderInstances;
}

function shouldSkipEventComponent(
  eventResponderInstance: ReactEventComponentInstance,
  propagatedEventResponders: null | Set<ReactEventResponder>,
): boolean {
  const responder = eventResponderInstance.responder;
  if (propagatedEventResponders !== null && responder.stopLocalPropagation) {
    if (propagatedEventResponders.has(responder)) {
      return true;
    }
    propagatedEventResponders.add(responder);
  }
  if (globalOwner && globalOwner !== eventResponderInstance) {
    return true;
  }
  if (
    responderOwners.has(responder) &&
    responderOwners.get(responder) !== eventResponderInstance
  ) {
    return true;
  }
  return false;
}

function traverseAndHandleEventResponderInstances(
  topLevelType: DOMTopLevelEventType,
  targetFiber: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget,
  eventSystemFlags: EventSystemFlags,
): void {
  const isPassiveEvent = (eventSystemFlags & IS_PASSIVE) !== 0;
  const isPassiveSupported = (eventSystemFlags & PASSIVE_NOT_SUPPORTED) === 0;
  const listeningName = generateListeningKey(
    ((topLevelType: any): string),
    isPassiveEvent || !isPassiveSupported,
  );

  // Trigger event responders in this order:
  // - Capture target phase
  // - Bubble target phase
  // - Root phase

  const targetEventResponderInstances = getTargetEventResponderInstances(
    listeningName,
    targetFiber,
  );
  const responderEvent = createResponderEvent(
    ((topLevelType: any): string),
    nativeEvent,
    ((nativeEventTarget: any): Element | Document),
    isPassiveEvent,
    isPassiveSupported,
  );
  const propagatedEventResponders: Set<ReactEventResponder> = new Set();
  let length = targetEventResponderInstances.length;
  let i;

  // Captured and bubbled event phases have the notion of local propagation.
  // This means that the propgation chain can be stopped part of the the way
  // through processing event component instances. The major difference to other
  // events systems is that the stopping of propgation is localized to a single
  // phase, rather than both phases.
  if (length > 0) {
    // Capture target phase
    for (i = length; i-- > 0; ) {
      const targetEventResponderInstance = targetEventResponderInstances[i];
      const {responder, props, state} = targetEventResponderInstance;
      const eventListener = responder.onEventCapture;
      if (eventListener !== undefined) {
        if (
          shouldSkipEventComponent(
            targetEventResponderInstance,
            propagatedEventResponders,
          )
        ) {
          continue;
        }
        currentInstance = targetEventResponderInstance;
        eventListener(responderEvent, eventResponderContext, props, state);
      }
    }
    // We clean propagated event responders between phases.
    propagatedEventResponders.clear();
    // Bubble target phase
    for (i = 0; i < length; i++) {
      const targetEventResponderInstance = targetEventResponderInstances[i];
      const {responder, props, state} = targetEventResponderInstance;
      const eventListener = responder.onEvent;
      if (eventListener !== undefined) {
        if (
          shouldSkipEventComponent(
            targetEventResponderInstance,
            propagatedEventResponders,
          )
        ) {
          continue;
        }
        currentInstance = targetEventResponderInstance;
        eventListener(responderEvent, eventResponderContext, props, state);
      }
    }
  }
  // Root phase
  const rootEventResponderInstances = getRootEventResponderInstances(
    listeningName,
  );
  length = rootEventResponderInstances.length;
  if (length > 0) {
    for (i = 0; i < length; i++) {
      const rootEventResponderInstance = rootEventResponderInstances[i];
      const {responder, props, state} = rootEventResponderInstance;
      const eventListener = responder.onRootEvent;
      if (eventListener !== undefined) {
        if (shouldSkipEventComponent(rootEventResponderInstance, null)) {
          continue;
        }
        currentInstance = rootEventResponderInstance;
        eventListener(responderEvent, eventResponderContext, props, state);
      }
    }
  }
}

function triggerOwnershipListeners(
  limitByResponder: null | ReactEventResponder,
): void {
  const listeningInstances = Array.from(ownershipChangeListeners);
  const previousInstance = currentInstance;
  try {
    for (let i = 0; i < listeningInstances.length; i++) {
      const instance = listeningInstances[i];
      const {props, responder, state} = instance;
      if (limitByResponder !== null && limitByResponder !== responder) {
        continue;
      }
      currentInstance = instance;
      const onOwnershipChange = responder.onOwnershipChange;
      if (onOwnershipChange !== undefined) {
        onOwnershipChange(eventResponderContext, props, state);
      }
    }
  } finally {
    currentInstance = previousInstance;
  }
}

export function mountEventResponder(
  eventComponentInstance: ReactEventComponentInstance,
) {
  const responder = eventComponentInstance.responder;
  if (responder.onOwnershipChange !== undefined) {
    ownershipChangeListeners.add(eventComponentInstance);
  }
  const onMount = responder.onMount;
  if (onMount !== undefined) {
    let {props, state} = eventComponentInstance;
    currentEventQueue = createEventQueue();
    currentInstance = eventComponentInstance;
    try {
      onMount(eventResponderContext, props, state);
    } finally {
      currentEventQueue = null;
      currentInstance = null;
      currentTimers = null;
    }
  }
}

export function unmountEventResponder(
  eventComponentInstance: ReactEventComponentInstance,
): void {
  const responder = eventComponentInstance.responder;
  const onUnmount = responder.onUnmount;
  if (onUnmount !== undefined) {
    let {props, state} = eventComponentInstance;
    currentEventQueue = createEventQueue();
    currentInstance = eventComponentInstance;
    try {
      onUnmount(eventResponderContext, props, state);
    } finally {
      currentEventQueue = null;
      currentInstance = null;
      currentTimers = null;
    }
  }
  try {
    currentEventQueue = createEventQueue();
    releaseOwnershipForEventComponentInstance(eventComponentInstance);
    processEventQueue();
  } finally {
    currentEventQueue = null;
  }
  if (responder.onOwnershipChange !== undefined) {
    ownershipChangeListeners.delete(eventComponentInstance);
  }
  const rootEventTypesSet = eventComponentInstance.rootEventTypes;
  if (rootEventTypesSet !== null) {
    const rootEventTypes = Array.from(rootEventTypesSet);

    for (let i = 0; i < rootEventTypes.length; i++) {
      const topLevelEventType = rootEventTypes[i];
      let rootEventComponentInstances = rootEventTypesToEventComponentInstances.get(
        topLevelEventType,
      );
      if (rootEventComponentInstances !== undefined) {
        rootEventComponentInstances.delete(eventComponentInstance);
      }
    }
  }
}

function validateResponderContext(): void {
  invariant(
    currentEventQueue && currentInstance,
    'An event responder context was used outside of an event cycle. ' +
      'Use context.setTimeout() to use asynchronous responder context outside of event cycle .',
  );
}

export function dispatchEventForResponderEventSystem(
  topLevelType: DOMTopLevelEventType,
  targetFiber: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget,
  eventSystemFlags: EventSystemFlags,
): void {
  if (enableEventAPI) {
    const previousEventQueue = currentEventQueue;
    const previousInstance = currentInstance;
    const previousTimers = currentTimers;
    currentTimers = null;
    currentEventQueue = createEventQueue();
    try {
      traverseAndHandleEventResponderInstances(
        topLevelType,
        targetFiber,
        nativeEvent,
        nativeEventTarget,
        eventSystemFlags,
      );
      processEventQueue();
    } finally {
      currentTimers = previousTimers;
      currentInstance = previousInstance;
      currentEventQueue = previousEventQueue;
    }
  }
}

export function addRootEventTypesForComponentInstance(
  eventComponentInstance: ReactEventComponentInstance,
  rootEventTypes: Array<ReactEventResponderEventType>,
): void {
  for (let i = 0; i < rootEventTypes.length; i++) {
    const rootEventType = rootEventTypes[i];
    registerRootEventType(rootEventType, eventComponentInstance);
  }
}

function registerRootEventType(
  rootEventType: ReactEventResponderEventType,
  eventComponentInstance: ReactEventComponentInstance,
): void {
  let name = rootEventType;
  let passive = true;

  if (typeof rootEventType !== 'string') {
    const targetEventConfigObject = ((rootEventType: any): {
      name: string,
      passive?: boolean,
    });
    name = targetEventConfigObject.name;
    if (targetEventConfigObject.passive !== undefined) {
      passive = targetEventConfigObject.passive;
    }
  }

  const listeningName = generateListeningKey(((name: any): string), passive);
  let rootEventComponentInstances = rootEventTypesToEventComponentInstances.get(
    listeningName,
  );
  if (rootEventComponentInstances === undefined) {
    rootEventComponentInstances = new Set();
    rootEventTypesToEventComponentInstances.set(
      listeningName,
      rootEventComponentInstances,
    );
  }
  let rootEventTypesSet = eventComponentInstance.rootEventTypes;
  if (rootEventTypesSet === null) {
    rootEventTypesSet = eventComponentInstance.rootEventTypes = new Set();
  }
  invariant(
    !rootEventTypesSet.has(listeningName),
    'addRootEventTypes() found a duplicate root event ' +
      'type of "%s". This might be because the event type exists in the event responder "rootEventTypes" ' +
      'array or because of a previous addRootEventTypes() using this root event type.',
    name,
  );
  rootEventTypesSet.add(listeningName);
  rootEventComponentInstances.add(
    ((eventComponentInstance: any): ReactEventComponentInstance),
  );
}

export function generateListeningKey(
  topLevelType: string,
  passive: boolean,
): string {
  // Create a unique name for this event, plus its properties. We'll
  // use this to ensure we don't listen to the same event with the same
  // properties again.
  const passiveKey = passive ? '_passive' : '_active';
  return `${topLevelType}${passiveKey}`;
}
