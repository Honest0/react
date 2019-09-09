/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactDOMResponderContext,
  ReactDOMResponderEvent,
  PointerType,
} from 'shared/ReactDOMTypes';
import type {ReactEventResponderListener} from 'shared/ReactTypes';

import React from 'react';
import {
  buttonsEnum,
  hasPointerEvents,
  isMac,
  dispatchDiscreteEvent,
  dispatchUserBlockingEvent,
} from './shared';

type TapProps = {|
  disabled: boolean,
  preventDefault: boolean,
  onTapCancel: (e: TapEvent) => void,
  onTapChange: boolean => void,
  onTapEnd: (e: TapEvent) => void,
  onTapStart: (e: TapEvent) => void,
  onTapUpdate: (e: TapEvent) => void,
|};

type TapState = {
  activePointerId: null | number,
  buttons: 0 | 1 | 4,
  gestureState: TapGestureState,
  ignoreEmulatedEvents: boolean,
  isActive: boolean,
  pointerType: PointerType,
  responderTarget: null | Element,
  rootEvents: null | Array<string>,
  shouldPreventClick: boolean,
};

type TapEventType =
  | 'tap-cancel'
  | 'tap-change'
  | 'tap-end'
  | 'tap-start'
  | 'tap-update';

type TapGestureState = {|
  altKey: boolean,
  buttons: 0 | 1 | 4,
  ctrlKey: boolean,
  height: number,
  metaKey: boolean,
  pageX: number,
  pageY: number,
  pointerType: PointerType,
  pressure: number,
  screenX: number,
  screenY: number,
  shiftKey: boolean,
  tangentialPressure: number,
  target: null | Element,
  tiltX: number,
  tiltY: number,
  timeStamp: number,
  twist: number,
  width: number,
  x: number,
  y: number,
|};

type TapEvent = {|
  ...TapGestureState,
  type: TapEventType,
|};

/**
 * Native event dependencies
 */

const targetEventTypes = hasPointerEvents
  ? ['pointerdown']
  : ['mousedown', 'touchstart'];

const rootEventTypes = hasPointerEvents
  ? [
      'click_active',
      'contextmenu',
      'pointerup',
      'pointermove',
      'pointercancel',
      'scroll',
    ]
  : [
      'click_active',
      'contextmenu',
      'mouseup',
      'mousemove',
      'dragstart',
      'touchend',
      'touchmove',
      'touchcancel',
      'scroll',
    ];

/**
 * Responder and gesture state
 */

function createInitialState(): TapState {
  return {
    activePointerId: null,
    buttons: 0,
    ignoreEmulatedEvents: false,
    isActive: false,
    pointerType: '',
    responderTarget: null,
    rootEvents: null,
    shouldPreventClick: true,
    gestureState: {
      altKey: false,
      buttons: 0,
      ctrlKey: false,
      height: 1,
      metaKey: false,
      pageX: 0,
      pageY: 0,
      pointerType: '',
      pressure: 0,
      screenX: 0,
      screenY: 0,
      shiftKey: false,
      tangentialPressure: 0,
      target: null,
      tiltX: 0,
      tiltY: 0,
      timeStamp: 0,
      twist: 0,
      width: 1,
      x: 0,
      y: 0,
    },
  };
}

function createPointerEventGestureState(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
  event: ReactDOMResponderEvent,
): TapGestureState {
  const timeStamp = context.getTimeStamp();
  const nativeEvent = (event.nativeEvent: any);
  const {
    altKey,
    ctrlKey,
    height,
    metaKey,
    pageX,
    pageY,
    pointerType,
    pressure,
    screenX,
    screenY,
    shiftKey,
    tangentialPressure,
    tiltX,
    tiltY,
    twist,
    width,
    clientX,
    clientY,
  } = nativeEvent;

  return {
    altKey,
    buttons: state.buttons,
    ctrlKey,
    height,
    metaKey,
    pageX,
    pageY,
    pointerType,
    pressure,
    screenX,
    screenY,
    shiftKey,
    tangentialPressure,
    target: state.responderTarget,
    tiltX,
    tiltY,
    timeStamp,
    twist,
    width,
    x: clientX,
    y: clientY,
  };
}

function createFallbackGestureState(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
  event: ReactDOMResponderEvent,
): TapGestureState {
  const timeStamp = context.getTimeStamp();
  const nativeEvent = (event.nativeEvent: any);
  const eType = event.type;
  const {altKey, ctrlKey, metaKey, shiftKey} = nativeEvent;
  const isCancelType = eType === 'dragstart' || eType === 'touchcancel';
  const isEndType = eType === 'mouseup' || eType === 'touchend';
  const isTouchEvent = event.pointerType === 'touch';

  let pointerEvent = nativeEvent;
  if (!hasPointerEvents && isTouchEvent) {
    const touch = getTouchById(nativeEvent, state.activePointerId);
    if (touch != null) {
      pointerEvent = touch;
    }
  }

  const {
    pageX,
    pageY,
    // $FlowExpectedError: missing from 'Touch' typedef
    radiusX,
    // $FlowExpectedError: missing from 'Touch' typedef
    radiusY,
    // $FlowExpectedError: missing from 'Touch' typedef
    rotationAngle,
    screenX,
    screenY,
    clientX,
    clientY,
  } = pointerEvent;

  return {
    altKey,
    buttons: state.buttons != null ? state.buttons : 1,
    ctrlKey,
    height: !isCancelType && radiusY != null ? radiusY * 2 : 1,
    metaKey,
    pageX: isCancelType ? 0 : pageX,
    pageY: isCancelType ? 0 : pageY,
    pointerType: event.pointerType,
    pressure: isEndType || isCancelType ? 0 : isTouchEvent ? 1 : 0.5,
    screenX: isCancelType ? 0 : screenX,
    screenY: isCancelType ? 0 : screenY,
    shiftKey,
    tangentialPressure: 0,
    target: state.responderTarget,
    tiltX: 0,
    tiltY: 0,
    timeStamp,
    twist: rotationAngle != null ? rotationAngle : 0,
    width: !isCancelType && radiusX != null ? radiusX * 2 : 1,
    x: isCancelType ? 0 : clientX,
    y: isCancelType ? 0 : clientY,
  };
}

const createGestureState = hasPointerEvents
  ? createPointerEventGestureState
  : createFallbackGestureState;

/**
 * Managing root events
 */

function addRootEventTypes(
  rootEvents: Array<string>,
  context: ReactDOMResponderContext,
  state: TapState,
): void {
  if (!state.rootEvents) {
    state.rootEvents = rootEvents;
    context.addRootEventTypes(state.rootEvents);
  }
}

function removeRootEventTypes(
  context: ReactDOMResponderContext,
  state: TapState,
): void {
  if (state.rootEvents != null) {
    context.removeRootEventTypes(state.rootEvents);
    state.rootEvents = null;
  }
}

/**
 * Managing pointers
 */

function getTouchById(
  nativeEvent: TouchEvent,
  pointerId: null | number,
): null | Touch {
  if (pointerId != null) {
    const changedTouches = nativeEvent.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      const touch = changedTouches[i];
      if (touch.identifier === pointerId) {
        return touch;
      }
    }
    return null;
  }
  return null;
}

function getHitTarget(
  event: ReactDOMResponderEvent,
  context: ReactDOMResponderContext,
  state: TapState,
): null | Element | Document {
  if (!hasPointerEvents && event.pointerType === 'touch') {
    const doc = context.getActiveDocument();
    const nativeEvent: any = event.nativeEvent;
    const touch = getTouchById(nativeEvent, state.activePointerId);
    if (touch != null) {
      return doc.elementFromPoint(touch.clientX, touch.clientY);
    } else {
      return null;
    }
  }
  return event.target;
}

function isActivePointer(
  event: ReactDOMResponderEvent,
  state: TapState,
): boolean {
  const nativeEvent: any = event.nativeEvent;
  const activePointerId = state.activePointerId;

  if (hasPointerEvents) {
    const eventPointerId = nativeEvent.pointerId;
    if (activePointerId != null && eventPointerId != null) {
      return (
        state.pointerType === event.pointerType &&
        activePointerId === eventPointerId
      );
    } else {
      return true;
    }
  } else {
    if (event.pointerType === 'touch') {
      const touch = getTouchById(nativeEvent, activePointerId);
      return touch != null;
    } else {
      // accept all events that don't have ids
      return true;
    }
  }
}

function isModifiedTap(event: ReactDOMResponderEvent): boolean {
  const nativeEvent: any = event.nativeEvent;
  const {altKey, ctrlKey, metaKey, shiftKey} = nativeEvent;
  return (
    altKey === true || ctrlKey === true || metaKey === true || shiftKey === true
  );
}

function shouldActivate(event: ReactDOMResponderEvent): boolean {
  const nativeEvent: any = event.nativeEvent;
  const pointerType = event.pointerType;
  const buttons = nativeEvent.buttons;
  const isContextMenu = pointerType === 'mouse' && nativeEvent.ctrlKey && isMac;
  const isValidButton =
    buttons === buttonsEnum.primary || buttons === buttonsEnum.middle;

  if (pointerType === 'touch' || (isValidButton && !isContextMenu)) {
    return true;
  } else {
    return false;
  }
}

/**
 * Communicating gesture state back to components
 */

function dispatchStart(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
): void {
  const type = 'tap:start';
  const onTapStart = props.onTapStart;
  if (onTapStart != null) {
    const payload = {...state.gestureState, type};
    dispatchDiscreteEvent(context, payload, onTapStart);
  }
}

function dispatchChange(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
): void {
  const onTapChange = props.onTapChange;
  if (onTapChange != null) {
    const payload = state.isActive;
    dispatchDiscreteEvent(context, payload, onTapChange);
  }
}

function dispatchUpdate(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
) {
  const type = 'tap:update';
  const onTapUpdate = props.onTapUpdate;
  if (onTapUpdate != null) {
    const payload = {...state.gestureState, type};
    dispatchUserBlockingEvent(context, payload, onTapUpdate);
  }
}

function dispatchEnd(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
): void {
  const type = 'tap:end';
  const onTapEnd = props.onTapEnd;
  if (onTapEnd != null) {
    const payload = {...state.gestureState, type};
    dispatchDiscreteEvent(context, payload, onTapEnd);
  }
}

function dispatchCancel(
  context: ReactDOMResponderContext,
  props: TapProps,
  state: TapState,
): void {
  const type = 'tap:cancel';
  const onTapCancel = props.onTapCancel;
  if (onTapCancel != null) {
    const payload = {...state.gestureState, type};
    dispatchDiscreteEvent(context, payload, onTapCancel);
  }
}

/**
 * Responder implementation
 */

const responderImpl = {
  targetEventTypes,
  getInitialState(): TapState {
    return createInitialState();
  },
  onEvent(
    event: ReactDOMResponderEvent,
    context: ReactDOMResponderContext,
    props: TapProps,
    state: TapState,
  ): void {
    if (props.disabled) {
      removeRootEventTypes(context, state);
      if (state.isActive) {
        dispatchCancel(context, props, state);
        state.isActive = false;
      }
      return;
    }

    const nativeEvent: any = event.nativeEvent;
    const eventTarget: Element = nativeEvent.target;
    const eventType = event.type;

    switch (eventType) {
      // START
      case 'pointerdown':
      case 'mousedown':
      case 'touchstart': {
        if (hasPointerEvents) {
          const pointerId = nativeEvent.pointerId;
          state.activePointerId = pointerId;
          // Make mouse and touch pointers consistent.
          // Flow bug: https://github.com/facebook/flow/issues/8055
          // $FlowExpectedError
          eventTarget.releasePointerCapture(pointerId);
        } else {
          if (eventType === 'touchstart') {
            const targetTouches = nativeEvent.targetTouches;
            if (targetTouches.length > 0) {
              state.activePointerId = targetTouches[0].identifier;
            }
          }
          if (eventType === 'mousedown' && state.ignoreEmulatedEvents) {
            return;
          }
        }

        if (!state.isActive && shouldActivate(event)) {
          state.isActive = true;
          state.buttons = nativeEvent.buttons;
          state.pointerType = event.pointerType;
          state.responderTarget = context.getResponderNode();
          state.shouldPreventClick = props.preventDefault !== false;
          state.gestureState = createGestureState(context, props, state, event);
          dispatchStart(context, props, state);
          dispatchChange(context, props, state);
          addRootEventTypes(rootEventTypes, context, state);

          if (!hasPointerEvents) {
            if (eventType === 'touchstart') {
              state.ignoreEmulatedEvents = true;
            }
          }
        }
        break;
      }
    }
  },
  onRootEvent(
    event: ReactDOMResponderEvent,
    context: ReactDOMResponderContext,
    props: TapProps,
    state: TapState,
  ): void {
    const nativeEvent: any = event.nativeEvent;
    const eventType = event.type;
    const hitTarget = getHitTarget(event, context, state);

    switch (eventType) {
      // MOVE
      case 'pointermove':
      case 'mousemove':
      case 'touchmove': {
        if (!hasPointerEvents) {
          if (eventType === 'mousemove' && state.ignoreEmulatedEvents) {
            return;
          }
        }

        if (state.isActive && isActivePointer(event, state)) {
          state.gestureState = createGestureState(context, props, state, event);
          if (context.isTargetWithinResponder(hitTarget)) {
            dispatchUpdate(context, props, state);
          } else {
            state.isActive = false;
            dispatchChange(context, props, state);
            dispatchCancel(context, props, state);
          }
        }
        break;
      }

      // END
      case 'pointerup':
      case 'mouseup':
      case 'touchend': {
        if (state.isActive && isActivePointer(event, state)) {
          if (state.buttons === buttonsEnum.middle) {
            // Remove the root events here as no 'click' event is dispatched
            // when this 'button' is pressed.
            removeRootEventTypes(context, state);
          }

          state.gestureState = createGestureState(context, props, state, event);

          state.isActive = false;
          dispatchChange(context, props, state);
          if (context.isTargetWithinResponder(hitTarget)) {
            // Determine whether to call preventDefault on subsequent native events.
            if (isModifiedTap(event)) {
              state.shouldPreventClick = false;
            }
            dispatchEnd(context, props, state);
          } else {
            dispatchCancel(context, props, state);
          }
        }

        if (!hasPointerEvents) {
          if (eventType === 'mouseup') {
            state.ignoreEmulatedEvents = false;
          }
        }
        break;
      }

      // CANCEL
      case 'contextmenu':
      case 'pointercancel':
      case 'touchcancel':
      case 'dragstart': {
        if (state.isActive && isActivePointer(event, state)) {
          state.gestureState = createGestureState(context, props, state, event);
          state.isActive = false;
          dispatchChange(context, props, state);
          dispatchCancel(context, props, state);
        }
        break;
      }

      // CANCEL
      case 'scroll': {
        if (
          state.isActive &&
          state.responderTarget != null &&
          // We ignore incoming scroll events when using mouse events
          state.pointerType !== 'mouse' &&
          // If the scroll target is the document or if the pointer target
          // is within the 'scroll' target, then cancel the gesture
          context.isTargetWithinNode(state.responderTarget, nativeEvent.target)
        ) {
          state.gestureState = createGestureState(context, props, state, event);
          state.isActive = false;
          dispatchChange(context, props, state);
          dispatchCancel(context, props, state);
        }
        break;
      }

      case 'click': {
        if (state.shouldPreventClick) {
          nativeEvent.preventDefault();
        }
        removeRootEventTypes(context, state);
        break;
      }
    }
  },
  onUnmount(
    context: ReactDOMResponderContext,
    props: TapProps,
    state: TapState,
  ): void {
    removeRootEventTypes(context, state);
    if (state.isActive) {
      dispatchCancel(context, props, state);
      state.isActive = false;
    }
  },
};

export const TapResponder = React.unstable_createResponder(
  'Tap',
  responderImpl,
);

export function useTap(props: TapProps): ReactEventResponderListener<any, any> {
  return React.unstable_useResponder(TapResponder, props);
}
