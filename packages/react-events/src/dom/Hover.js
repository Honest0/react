/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactDOMEventResponder,
  ReactDOMResponderEvent,
  ReactDOMResponderContext,
} from 'shared/ReactDOMTypes';

import React from 'react';
import {UserBlockingEvent} from 'shared/ReactTypes';

type HoverProps = {
  disabled: boolean,
  delayHoverEnd: number,
  delayHoverStart: number,
  onHoverChange: boolean => void,
  onHoverEnd: (e: HoverEvent) => void,
  onHoverMove: (e: HoverEvent) => void,
  onHoverStart: (e: HoverEvent) => void,
  preventDefault: boolean,
};

type HoverState = {
  hoverTarget: null | Element | Document,
  isActiveHovered: boolean,
  isHovered: boolean,
  isOverTouchHitTarget: boolean,
  isTouched: boolean,
  hoverStartTimeout: null | number,
  hoverEndTimeout: null | number,
  ignoreEmulatedMouseEvents: boolean,
};

type HoverEventType = 'hoverstart' | 'hoverend' | 'hoverchange' | 'hovermove';

type HoverEvent = {|
  target: Element | Document,
  type: HoverEventType,
  timeStamp: number,
  clientX: null | number,
  clientY: null | number,
  pageX: null | number,
  pageY: null | number,
  screenX: null | number,
  screenY: null | number,
  x: null | number,
  y: null | number,
|};

const DEFAULT_HOVER_END_DELAY_MS = 0;
const DEFAULT_HOVER_START_DELAY_MS = 0;

const targetEventTypes = [
  'pointerover',
  'pointermove',
  'pointerout',
  'pointercancel',
];

// If PointerEvents is not supported (e.g., Safari), also listen to touch and mouse events.
if (typeof window !== 'undefined' && window.PointerEvent === undefined) {
  targetEventTypes.push('touchstart', 'mouseover', 'mousemove', 'mouseout');
}

function createHoverEvent(
  event: ?ReactDOMResponderEvent,
  context: ReactDOMResponderContext,
  type: HoverEventType,
  target: Element | Document,
): HoverEvent {
  let clientX = null;
  let clientY = null;
  let pageX = null;
  let pageY = null;
  let screenX = null;
  let screenY = null;

  if (event) {
    const nativeEvent = (event.nativeEvent: any);
    ({clientX, clientY, pageX, pageY, screenX, screenY} = nativeEvent);
  }

  return {
    target,
    type,
    timeStamp: context.getTimeStamp(),
    clientX,
    clientY,
    pageX,
    pageY,
    screenX,
    screenY,
    x: clientX,
    y: clientY,
  };
}

function dispatchHoverChangeEvent(
  event: null | ReactDOMResponderEvent,
  context: ReactDOMResponderContext,
  props: HoverProps,
  state: HoverState,
): void {
  const bool = state.isActiveHovered;
  const listener = () => {
    props.onHoverChange(bool);
  };
  const syntheticEvent = createHoverEvent(
    event,
    context,
    'hoverchange',
    ((state.hoverTarget: any): Element | Document),
  );
  context.dispatchEvent(syntheticEvent, listener, UserBlockingEvent);
}

function dispatchHoverStartEvents(
  event: ReactDOMResponderEvent,
  context: ReactDOMResponderContext,
  props: HoverProps,
  state: HoverState,
): void {
  const target = state.hoverTarget;
  if (event !== null) {
    const {nativeEvent} = event;
    if (
      context.isTargetWithinEventResponderScope(
        (nativeEvent: any).relatedTarget,
      )
    ) {
      return;
    }
  }

  state.isHovered = true;

  if (state.hoverEndTimeout !== null) {
    context.clearTimeout(state.hoverEndTimeout);
    state.hoverEndTimeout = null;
  }

  const activate = () => {
    state.isActiveHovered = true;

    if (props.onHoverStart) {
      const syntheticEvent = createHoverEvent(
        event,
        context,
        'hoverstart',
        ((target: any): Element | Document),
      );
      context.dispatchEvent(
        syntheticEvent,
        props.onHoverStart,
        UserBlockingEvent,
      );
    }
    if (props.onHoverChange) {
      dispatchHoverChangeEvent(event, context, props, state);
    }
  };

  if (!state.isActiveHovered) {
    const delayHoverStart = calculateDelayMS(
      props.delayHoverStart,
      0,
      DEFAULT_HOVER_START_DELAY_MS,
    );
    if (delayHoverStart > 0) {
      state.hoverStartTimeout = context.setTimeout(() => {
        state.hoverStartTimeout = null;
        activate();
      }, delayHoverStart);
    } else {
      activate();
    }
  }
}

function dispatchHoverEndEvents(
  event: null | ReactDOMResponderEvent,
  context: ReactDOMResponderContext,
  props: HoverProps,
  state: HoverState,
) {
  const target = state.hoverTarget;
  if (event !== null) {
    const {nativeEvent} = event;
    if (
      context.isTargetWithinEventResponderScope(
        (nativeEvent: any).relatedTarget,
      )
    ) {
      return;
    }
  }

  state.isHovered = false;

  if (state.hoverStartTimeout !== null) {
    context.clearTimeout(state.hoverStartTimeout);
    state.hoverStartTimeout = null;
  }

  const deactivate = () => {
    state.isActiveHovered = false;

    if (props.onHoverEnd) {
      const syntheticEvent = createHoverEvent(
        event,
        context,
        'hoverend',
        ((target: any): Element | Document),
      );
      context.dispatchEvent(
        syntheticEvent,
        props.onHoverEnd,
        UserBlockingEvent,
      );
    }
    if (props.onHoverChange) {
      dispatchHoverChangeEvent(event, context, props, state);
    }

    state.isOverTouchHitTarget = false;
    state.hoverTarget = null;
    state.ignoreEmulatedMouseEvents = false;
    state.isTouched = false;
  };

  if (state.isActiveHovered) {
    const delayHoverEnd = calculateDelayMS(
      props.delayHoverEnd,
      0,
      DEFAULT_HOVER_END_DELAY_MS,
    );
    if (delayHoverEnd > 0) {
      state.hoverEndTimeout = context.setTimeout(() => {
        deactivate();
      }, delayHoverEnd);
    } else {
      deactivate();
    }
  }
}

function calculateDelayMS(delay: ?number, min = 0, fallback = 0) {
  const maybeNumber = delay == null ? null : delay;
  return Math.max(min, maybeNumber != null ? maybeNumber : fallback);
}

function unmountResponder(
  context: ReactDOMResponderContext,
  props: HoverProps,
  state: HoverState,
): void {
  if (state.isHovered) {
    dispatchHoverEndEvents(null, context, props, state);
  }
}

function isEmulatedMouseEvent(event, state) {
  const {type} = event;
  return (
    state.ignoreEmulatedMouseEvents &&
    (type === 'mousemove' || type === 'mouseover' || type === 'mouseout')
  );
}

const HoverResponder: ReactDOMEventResponder = {
  displayName: 'Hover',
  targetEventTypes,
  createInitialState() {
    return {
      isActiveHovered: false,
      isHovered: false,
      isOverTouchHitTarget: false,
      isTouched: false,
      hoverStartTimeout: null,
      hoverEndTimeout: null,
      ignoreEmulatedMouseEvents: false,
    };
  },
  allowMultipleHostChildren: false,
  allowEventHooks: true,
  onEvent(
    event: ReactDOMResponderEvent,
    context: ReactDOMResponderContext,
    props: HoverProps,
    state: HoverState,
  ): void {
    const {pointerType, type} = event;

    if (props.disabled) {
      if (state.isHovered) {
        dispatchHoverEndEvents(event, context, props, state);
        state.ignoreEmulatedMouseEvents = false;
      }
      if (state.isTouched) {
        state.isTouched = false;
      }
      return;
    }

    switch (type) {
      // START
      case 'pointerover':
      case 'mouseover':
      case 'touchstart': {
        if (!state.isHovered) {
          // Prevent hover events for touch
          if (state.isTouched || pointerType === 'touch') {
            state.isTouched = true;
            return;
          }

          // Prevent hover events for emulated events
          if (isEmulatedMouseEvent(event, state)) {
            return;
          }

          if (context.isEventWithinTouchHitTarget(event)) {
            state.isOverTouchHitTarget = true;
            return;
          }
          state.hoverTarget = context.getEventCurrentTarget(event);
          state.ignoreEmulatedMouseEvents = true;
          dispatchHoverStartEvents(event, context, props, state);
        }
        return;
      }

      // MOVE
      case 'pointermove':
      case 'mousemove': {
        if (state.isHovered && !isEmulatedMouseEvent(event, state)) {
          if (state.isHovered) {
            if (state.isOverTouchHitTarget) {
              // If we were moving over the TouchHitTarget and have now moved
              // over the Responder target
              if (!context.isEventWithinTouchHitTarget(event)) {
                dispatchHoverStartEvents(event, context, props, state);
                state.isOverTouchHitTarget = false;
              }
            } else {
              // If we were moving over the Responder target and have now moved
              // over the TouchHitTarget
              if (context.isEventWithinTouchHitTarget(event)) {
                dispatchHoverEndEvents(event, context, props, state);
                state.isOverTouchHitTarget = true;
              } else {
                if (props.onHoverMove && state.hoverTarget !== null) {
                  const syntheticEvent = createHoverEvent(
                    event,
                    context,
                    'hovermove',
                    state.hoverTarget,
                  );
                  context.dispatchEvent(
                    syntheticEvent,
                    props.onHoverMove,
                    UserBlockingEvent,
                  );
                }
              }
            }
          }
        }
        return;
      }

      // END
      case 'pointerout':
      case 'pointercancel':
      case 'mouseout':
      case 'touchcancel':
      case 'touchend': {
        if (state.isHovered) {
          dispatchHoverEndEvents(event, context, props, state);
          state.ignoreEmulatedMouseEvents = false;
        }
        if (state.isTouched) {
          state.isTouched = false;
        }
        return;
      }
    }
  },
  onUnmount(
    context: ReactDOMResponderContext,
    props: HoverProps,
    state: HoverState,
  ) {
    unmountResponder(context, props, state);
  },
  onOwnershipChange(
    context: ReactDOMResponderContext,
    props: HoverProps,
    state: HoverState,
  ) {
    unmountResponder(context, props, state);
  },
};

export const Hover = React.unstable_createEvent(HoverResponder);

export function useHover(props: HoverProps): void {
  React.unstable_useEvent(Hover, props);
}
