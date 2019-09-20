/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {PointerType} from 'shared/ReactDOMTypes';

import React from 'react';
import {useTap} from 'react-interactions/events/tap';
import {useKeyboard} from 'react-interactions/events/keyboard';

const emptyObject = {};

type PressProps = $ReadOnly<{|
  disabled?: boolean,
  preventDefault?: boolean,
  onPress?: (e: PressEvent) => void,
  onPressChange?: boolean => void,
  onPressEnd?: (e: PressEvent) => void,
  onPressMove?: (e: PressEvent) => void,
  onPressStart?: (e: PressEvent) => void,
|}>;

type PressEventType =
  | 'pressstart'
  | 'presschange'
  | 'pressmove'
  | 'pressend'
  | 'press';

type PressEvent = {|
  altKey: boolean,
  buttons: null | 1 | 4,
  ctrlKey: boolean,
  defaultPrevented: boolean,
  key: null | string,
  metaKey: boolean,
  pageX: number,
  pageY: number,
  pointerType: PointerType,
  shiftKey: boolean,
  target: null | Element,
  timeStamp: number,
  type: PressEventType,
  x: number,
  y: number,
|};

function createGestureState(e: any, type: PressEventType): PressEvent {
  return {
    altKey: e.altKey,
    buttons: e.type === 'tap:auxiliary' ? 4 : 1,
    ctrlKey: e.ctrlKey,
    defaultPrevented: e.defaultPrevented,
    key: e.key,
    metaKey: e.metaKey,
    pageX: e.pageX,
    pageY: e.pageX,
    pointerType: e.pointerType,
    shiftKey: e.shiftKey,
    target: e.target,
    timeStamp: e.timeStamp,
    type,
    x: e.x,
    y: e.y,
  };
}

function isValidKey(e): boolean {
  const {key, target} = e;
  const {tagName, isContentEditable} = (target: any);
  return (
    (key === 'Enter' || key === ' ') &&
    (tagName !== 'INPUT' &&
      tagName !== 'TEXTAREA' &&
      isContentEditable !== true)
  );
}

function handlePreventDefault(preventDefault: ?boolean, e: any): void {
  const key = e.key;
  if (preventDefault !== false && (key === ' ' || key === 'Enter')) {
    e.preventDefault();
  }
}

/**
 * The lack of built-in composition for gesture responders means we have to
 * selectively ignore callbacks from useKeyboard or useTap if the other is
 * active.
 */
export function usePress(props: PressProps) {
  const safeProps = props || emptyObject;
  const {
    disabled,
    preventDefault,
    onPress,
    onPressChange,
    onPressEnd,
    onPressMove,
    onPressStart,
  } = safeProps;

  const [active, updateActive] = React.useState(null);

  const tap = useTap({
    disabled: disabled || active === 'keyboard',
    preventDefault,
    onAuxiliaryTap(e) {
      if (onPressStart != null) {
        onPressStart(createGestureState(e, 'pressstart'));
      }
      if (onPressEnd != null) {
        onPressEnd(createGestureState(e, 'pressend'));
      }
      // Here we rely on Tap only calling 'onAuxiliaryTap' with modifiers when
      // the primary button is pressed
      if (onPress != null && (e.metaKey || e.shiftKey)) {
        onPress(createGestureState(e, 'press'));
      }
    },
    onTapStart(e) {
      if (active == null) {
        updateActive('tap');
        if (onPressStart != null) {
          onPressStart(createGestureState(e, 'pressstart'));
        }
      }
    },
    onTapChange: onPressChange,
    onTapUpdate(e) {
      if (active === 'tap') {
        if (onPressMove != null) {
          onPressMove(createGestureState(e, 'pressmove'));
        }
      }
    },
    onTapEnd(e) {
      if (active === 'tap') {
        if (onPressEnd != null) {
          onPressEnd(createGestureState(e, 'pressend'));
        }
        if (onPress != null) {
          onPress(createGestureState(e, 'press'));
        }
        updateActive(null);
      }
    },
    onTapCancel(e) {
      if (active === 'tap') {
        if (onPressEnd != null) {
          onPressEnd(createGestureState(e, 'pressend'));
        }
        updateActive(null);
      }
    },
  });

  const keyboard = useKeyboard({
    disabled: disabled || active === 'tap',
    onClick(e) {
      if (preventDefault !== false) {
        e.preventDefault();
      }
      if (active == null && onPress != null) {
        onPress(createGestureState(e, 'press'));
      }
    },
    onKeyDown(e) {
      if (active == null && isValidKey(e)) {
        handlePreventDefault(preventDefault, e);
        updateActive('keyboard');

        if (onPressStart != null) {
          onPressStart(createGestureState(e, 'pressstart'));
        }
        if (onPressChange != null) {
          onPressChange(true);
        }
      }
    },
    onKeyUp(e) {
      if (active === 'keyboard' && isValidKey(e)) {
        handlePreventDefault(preventDefault, e);
        if (onPressChange != null) {
          onPressChange(false);
        }
        if (onPressEnd != null) {
          onPressEnd(createGestureState(e, 'pressend'));
        }
        if (onPress != null) {
          onPress(createGestureState(e, 'press'));
        }
        updateActive(null);
      }
    },
  });

  return [tap, keyboard];
}
