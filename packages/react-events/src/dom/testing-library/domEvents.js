/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {buttonsType} from './domEnvironment';

/**
 * Native event object mocks for higher-level events.
 *
 * 1. Each event type defines the exact object that it accepts. This ensures
 * that no arbitrary properties can be assigned to events, and the properties
 * that don't exist on specific event types (e.g., 'pointerType') are not added
 * to the respective native event.
 *
 * 2. Properties that cannot be relied on due to inconsistent browser support (e.g., 'x' and 'y') are not
 * added to the native event. Others that shouldn't be arbitrarily customized (e.g., 'screenX')
 * are automatically inferred from associated values.
 *
 * 3. PointerEvent and TouchEvent fields are normalized (e.g., 'rotationAngle' -> 'twist')
 */

const defaultPointerSize = 23;
const defaultBrowserChromeSize = 50;

function emptyFunction() {}

function createEvent(type, data = {}) {
  const event = document.createEvent('CustomEvent');
  event.initCustomEvent(type, true, true);
  if (data != null) {
    Object.keys(data).forEach(key => {
      const value = data[key];
      Object.defineProperty(event, key, {value});
    });
  }
  return event;
}

function createGetModifierState(keyArg, data) {
  if (keyArg === 'Alt') {
    return data.altKey || false;
  }
  if (keyArg === 'Control') {
    return data.ctrlKey || false;
  }
  if (keyArg === 'Meta') {
    return data.metaKey || false;
  }
  if (keyArg === 'Shift') {
    return data.shiftKey || false;
  }
}

function createPointerEvent(
  type,
  {
    altKey = false,
    buttons = buttonsType.none,
    ctrlKey = false,
    height,
    metaKey = false,
    movementX = 0,
    movementY = 0,
    offsetX = 0,
    offsetY = 0,
    pageX,
    pageY,
    pointerId = 1,
    pressure = 0,
    preventDefault = emptyFunction,
    pointerType = 'mouse',
    shiftKey = false,
    tangentialPressure = 0,
    tiltX = 0,
    tiltY = 0,
    twist = 0,
    width,
    x = 0,
    y = 0,
  } = {},
) {
  const modifierState = {altKey, ctrlKey, metaKey, shiftKey};

  return createEvent(type, {
    altKey,
    buttons,
    clientX: x,
    clientY: y,
    ctrlKey,
    getModifierState(keyArg) {
      createGetModifierState(keyArg, modifierState);
    },
    height:
      pointerType === 'mouse'
        ? 1
        : height != null
          ? height
          : defaultPointerSize,
    metaKey,
    movementX,
    movementY,
    offsetX,
    offsetY,
    pageX: pageX || x,
    pageY: pageY || y,
    pointerId,
    pointerType,
    pressure,
    preventDefault,
    screenX: x,
    screenY: y + defaultBrowserChromeSize,
    shiftKey,
    tangentialPressure,
    tiltX,
    tiltY,
    twist,
    width:
      pointerType === 'mouse' ? 1 : width != null ? width : defaultPointerSize,
  });
}

function createKeyboardEvent(
  type,
  {
    altKey = false,
    ctrlKey = false,
    key = '',
    metaKey = false,
    preventDefault = emptyFunction,
    shiftKey = false,
  } = {},
) {
  const modifierState = {altKey, ctrlKey, metaKey, shiftKey};

  return createEvent(type, {
    altKey,
    ctrlKey,
    getModifierState(keyArg) {
      createGetModifierState(keyArg, modifierState);
    },
    key,
    metaKey,
    preventDefault,
    shiftKey,
  });
}

function createMouseEvent(
  type,
  {
    altKey = false,
    buttons = buttonsType.none,
    ctrlKey = false,
    metaKey = false,
    movementX = 0,
    movementY = 0,
    offsetX = 0,
    offsetY = 0,
    pageX,
    pageY,
    preventDefault = emptyFunction,
    shiftKey = false,
    x = 0,
    y = 0,
  } = {},
) {
  const modifierState = {altKey, ctrlKey, metaKey, shiftKey};

  return createEvent(type, {
    altKey,
    buttons,
    clientX: x,
    clientY: y,
    ctrlKey,
    getModifierState(keyArg) {
      createGetModifierState(keyArg, modifierState);
    },
    metaKey,
    movementX,
    movementY,
    offsetX,
    offsetY,
    pageX: pageX || x,
    pageY: pageY || y,
    preventDefault,
    screenX: x,
    screenY: y + defaultBrowserChromeSize,
    shiftKey,
  });
}

function createTouchEvent(
  type,
  {
    altKey = false,
    ctrlKey = false,
    height = defaultPointerSize,
    metaKey = false,
    pageX,
    pageY,
    pointerId = 1,
    preventDefault = emptyFunction,
    shiftKey = false,
    twist = 0,
    width = defaultPointerSize,
    x = 0,
    y = 0,
  } = {},
) {
  const touch = {
    clientX: x,
    clientY: y,
    force: 1,
    identifier: pointerId,
    pageX: pageX || x,
    pageY: pageY || y,
    radiusX: width / 2,
    radiusY: height / 2,
    rotationAngle: twist,
    screenX: x,
    screenY: y + defaultBrowserChromeSize,
  };

  const activeTouch = type !== 'touchend' ? [touch] : null;

  return createEvent(type, {
    altKey,
    changedTouches: [touch],
    ctrlKey,
    metaKey,
    preventDefault,
    shiftKey,
    targetTouches: activeTouch,
    touches: activeTouch,
  });
}

/**
 * Mock event objects
 */

export function blur({relatedTarget} = {}) {
  return createEvent('blur', {relatedTarget});
}

export function click(payload) {
  return createMouseEvent('click', payload);
}

export function contextmenu(payload) {
  return createMouseEvent('contextmenu', payload);
}

export function dragstart(payload) {
  return createMouseEvent('dragstart', payload);
}

export function focus({relatedTarget} = {}) {
  return createEvent('focus', {relatedTarget});
}

export function scroll() {
  return createEvent('scroll');
}

/**
 * Key events
 */

export function keydown(payload) {
  return createKeyboardEvent('keydown', payload);
}

export function keyup(payload) {
  return createKeyboardEvent('keyup', payload);
}

/**
 * Pointer events
 */

export function gotpointercapture(payload) {
  return createPointerEvent('gotpointercapture', payload);
}

export function lostpointercapture(payload) {
  return createPointerEvent('lostpointercapture', payload);
}

export function pointercancel(payload) {
  return createPointerEvent('pointercancel', payload);
}

export function pointerdown(payload) {
  const isTouch = payload != null && payload.pointerType === 'mouse';
  return createPointerEvent('pointerdown', {
    buttons: buttonsType.primary,
    pressure: isTouch ? 1 : 0.5,
    ...payload,
  });
}

export function pointerenter(payload) {
  return createPointerEvent('pointerenter', payload);
}

export function pointerleave(payload) {
  return createPointerEvent('pointerleave', payload);
}

export function pointermove(payload) {
  return createPointerEvent('pointermove', payload);
}

export function pointerout(payload) {
  return createPointerEvent('pointerout', payload);
}

export function pointerover(payload) {
  return createPointerEvent('pointerover', payload);
}

export function pointerup(payload) {
  return createPointerEvent('pointerup', {
    ...payload,
    buttons: buttonsType.none,
  });
}

/**
 * Mouse events
 */

export function mousedown(payload) {
  return createMouseEvent('mousedown', {
    buttons: buttonsType.primary,
    ...payload,
  });
}

export function mouseenter(payload) {
  return createMouseEvent('mouseenter', payload);
}

export function mouseleave(payload) {
  return createMouseEvent('mouseleave', payload);
}

export function mousemove(payload) {
  return createMouseEvent('mousemove', payload);
}

export function mouseout(payload) {
  return createMouseEvent('mouseout', payload);
}

export function mouseover(payload) {
  return createMouseEvent('mouseover', payload);
}

export function mouseup(payload) {
  return createMouseEvent('mouseup', {
    ...payload,
    buttons: buttonsType.none,
  });
}

/**
 * Touch events
 */

export function touchcancel(payload) {
  return createTouchEvent('touchcancel', payload);
}

export function touchend(payload) {
  return createTouchEvent('touchend', payload);
}

export function touchmove(payload) {
  return createTouchEvent('touchmove', payload);
}

export function touchstart(payload) {
  return createTouchEvent('touchstart', payload);
}
