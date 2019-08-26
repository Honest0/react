/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {
  buttonsType,
  createEventTarget,
  setPointerEvent,
} from '../testing-library';

let React;
let ReactFeatureFlags;
let ReactDOM;
let PressResponder;
let usePress;

function initializeModules(hasPointerEvents) {
  jest.resetModules();
  setPointerEvent(hasPointerEvents);
  ReactFeatureFlags = require('shared/ReactFeatureFlags');
  ReactFeatureFlags.enableFlareAPI = true;
  React = require('react');
  ReactDOM = require('react-dom');
  PressResponder = require('react-events/press').PressResponder;
  usePress = require('react-events/press').usePress;
}

function removePressMoveStrings(eventString) {
  if (eventString === 'onPressMove') {
    return false;
  }
  return true;
}

const forcePointerEvents = true;
const environmentTable = [[forcePointerEvents], [!forcePointerEvents]];

const pointerTypesTable = [['mouse'], ['touch']];

describe.each(environmentTable)('Press responder', hasPointerEvents => {
  let container;

  beforeEach(() => {
    initializeModules(hasPointerEvents);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.render(null, container);
    document.body.removeChild(container);
    container = null;
  });

  describe('disabled', () => {
    let onPressStart, onPress, onPressEnd, ref;

    beforeEach(() => {
      onPressStart = jest.fn();
      onPress = jest.fn();
      onPressEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          disabled: true,
          onPressStart,
          onPress,
          onPressEnd,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    it('does not call callbacks', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup();
      expect(onPressStart).not.toBeCalled();
      expect(onPress).not.toBeCalled();
      expect(onPressEnd).not.toBeCalled();
    });
  });

  describe('onPressStart', () => {
    let onPressStart, ref;

    beforeEach(() => {
      onPressStart = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          onPressStart,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    it.each(pointerTypesTable)(
      'is called after pointer down: %s',
      pointerType => {
        const target = createEventTarget(ref.current);
        target.pointerdown({pointerType});
        expect(onPressStart).toHaveBeenCalledTimes(1);
        expect(onPressStart).toHaveBeenCalledWith(
          expect.objectContaining({pointerType, type: 'pressstart'}),
        );
      },
    );

    it('is called after middle-button pointer down', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown({buttons: buttonsType.middle, pointerType: 'mouse'});
      expect(onPressStart).toHaveBeenCalledTimes(1);
      expect(onPressStart).toHaveBeenCalledWith(
        expect.objectContaining({
          buttons: buttonsType.middle,
          pointerType: 'mouse',
          type: 'pressstart',
        }),
      );
    });

    it('is not called after pointer move following middle-button press', () => {
      const node = ref.current;
      const target = createEventTarget(node);
      target.setBoundingClientRect({x: 0, y: 0, width: 100, height: 100});
      target.pointerdown({buttons: buttonsType.middle, pointerType: 'mouse'});
      target.pointerup({pointerType: 'mouse'});
      target.pointerhover({x: 110, y: 110});
      target.pointerhover({x: 50, y: 50});
      expect(onPressStart).toHaveBeenCalledTimes(1);
    });

    it('ignores any events not caused by primary/middle-click or touch/pen contact', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown({buttons: buttonsType.secondary});
      target.pointerup({buttons: buttonsType.secondary});
      target.pointerdown({buttons: buttonsType.eraser});
      target.pointerup({buttons: buttonsType.eraser});
      expect(onPressStart).toHaveBeenCalledTimes(0);
    });

    it('is called once after "keydown" events for Enter', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.keydown({key: 'Enter'});
      target.keydown({key: 'Enter'});
      expect(onPressStart).toHaveBeenCalledTimes(1);
      expect(onPressStart).toHaveBeenCalledWith(
        expect.objectContaining({pointerType: 'keyboard', type: 'pressstart'}),
      );
    });

    it('is called once after "keydown" events for Spacebar', () => {
      const target = createEventTarget(ref.current);
      const preventDefault = jest.fn();
      target.keydown({key: ' ', preventDefault});
      expect(preventDefault).toBeCalled();
      target.keydown({key: ' ', preventDefault});
      expect(onPressStart).toHaveBeenCalledTimes(1);
      expect(onPressStart).toHaveBeenCalledWith(
        expect.objectContaining({
          pointerType: 'keyboard',
          type: 'pressstart',
        }),
      );
    });

    it('is not called after "keydown" for other keys', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'a'});
      expect(onPressStart).not.toBeCalled();
    });
  });

  describe('onPressEnd', () => {
    let onPressEnd, ref;

    beforeEach(() => {
      onPressEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          onPressEnd,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    it.each(pointerTypesTable)(
      'is called after pointer up: %s',
      pointerType => {
        const target = createEventTarget(ref.current);
        target.pointerdown({pointerType});
        target.pointerup({pointerType});
        expect(onPressEnd).toHaveBeenCalledTimes(1);
        expect(onPressEnd).toHaveBeenCalledWith(
          expect.objectContaining({pointerType, type: 'pressend'}),
        );
      },
    );

    it('is called after middle-button pointer up', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown({buttons: buttonsType.middle, pointerType: 'mouse'});
      target.pointerup({pointerType: 'mouse'});
      expect(onPressEnd).toHaveBeenCalledTimes(1);
      expect(onPressEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          buttons: buttonsType.middle,
          pointerType: 'mouse',
          type: 'pressend',
        }),
      );
    });

    it('is called after "keyup" event for Enter', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      // click occurs before keyup
      target.click();
      target.keyup({key: 'Enter'});
      expect(onPressEnd).toHaveBeenCalledTimes(1);
      expect(onPressEnd).toHaveBeenCalledWith(
        expect.objectContaining({pointerType: 'keyboard', type: 'pressend'}),
      );
    });

    it('is called after "keyup" event for Spacebar', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: ' '});
      target.keyup({key: ' '});
      expect(onPressEnd).toHaveBeenCalledTimes(1);
      expect(onPressEnd).toHaveBeenCalledWith(
        expect.objectContaining({pointerType: 'keyboard', type: 'pressend'}),
      );
    });

    it('is not called after "keyup" event for other keys', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.keyup({key: 'a'});
      expect(onPressEnd).not.toBeCalled();
    });

    it('is called with keyboard modifiers', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.keyup({
        key: 'Enter',
        metaKey: true,
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      });
      expect(onPressEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          pointerType: 'keyboard',
          type: 'pressend',
          metaKey: true,
          ctrlKey: true,
          altKey: true,
          shiftKey: true,
        }),
      );
    });
  });

  describe('onPressChange', () => {
    let onPressChange, ref;

    beforeEach(() => {
      onPressChange = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          onPressChange,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    it.each(pointerTypesTable)(
      'is called after pointer down and up: %s',
      pointerType => {
        const target = createEventTarget(ref.current);
        target.pointerdown({pointerType});
        expect(onPressChange).toHaveBeenCalledTimes(1);
        expect(onPressChange).toHaveBeenCalledWith(true);
        target.pointerup({pointerType});
        expect(onPressChange).toHaveBeenCalledTimes(2);
        expect(onPressChange).toHaveBeenCalledWith(false);
      },
    );

    it('is called after valid "keydown" and "keyup" events', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      expect(onPressChange).toHaveBeenCalledTimes(1);
      expect(onPressChange).toHaveBeenCalledWith(true);
      target.keyup({key: 'Enter'});
      expect(onPressChange).toHaveBeenCalledTimes(2);
      expect(onPressChange).toHaveBeenCalledWith(false);
    });
  });

  describe('onPress', () => {
    let onPress, ref;

    beforeEach(() => {
      onPress = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          onPress,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      ref.current.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
      });
      document.elementFromPoint = () => ref.current;
    });

    it.each(pointerTypesTable)(
      'is called after pointer up: %s',
      pointerType => {
        const target = createEventTarget(ref.current);
        target.pointerdown({pointerType});
        target.pointerup({pointerType, x: 10, y: 10});
        expect(onPress).toHaveBeenCalledTimes(1);
        expect(onPress).toHaveBeenCalledWith(
          expect.objectContaining({pointerType, type: 'press'}),
        );
      },
    );

    it('is not called after middle-button press', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown({buttons: buttonsType.middle, pointerType: 'mouse'});
      target.pointerup({pointerType: 'mouse'});
      expect(onPress).not.toHaveBeenCalled();
    });

    it('is called after valid "keyup" event', () => {
      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.keyup({key: 'Enter'});
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({pointerType: 'keyboard', type: 'press'}),
      );
    });

    it('is not called after invalid "keyup" event', () => {
      const inputRef = React.createRef();
      const Component = () => {
        const listener = usePress({onPress});
        return <input ref={inputRef} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      const target = createEventTarget(inputRef.current);
      target.keydown({key: 'Enter'});
      target.keyup({key: 'Enter'});
      target.keydown({key: ' '});
      target.keyup({key: ' '});
      expect(onPress).not.toBeCalled();
    });

    it('is called with modifier keys', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown({metaKey: true, pointerType: 'mouse'});
      target.pointerup({metaKey: true, pointerType: 'mouse'});
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({
          pointerType: 'mouse',
          type: 'press',
          metaKey: true,
        }),
      );
    });

    it('is called if target rect is not right but the target is (for mouse events)', () => {
      const buttonRef = React.createRef();
      const divRef = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return (
          <div ref={divRef} listeners={listener}>
            <button ref={buttonRef} />
          </div>
        );
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(divRef.current);
      target.setBoundingClientRect({x: 0, y: 0, width: 0, height: 0});
      const innerTarget = createEventTarget(buttonRef.current);
      innerTarget.pointerdown({pointerType: 'mouse'});
      innerTarget.pointerup({pointerType: 'mouse'});
      expect(onPress).toBeCalled();
    });
  });

  describe('onPressMove', () => {
    let onPressMove, ref;

    beforeEach(() => {
      onPressMove = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = usePress({
          onPressMove,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      ref.current.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
      });
      document.elementFromPoint = () => ref.current;
    });

    it.each(pointerTypesTable)(
      'is called after pointer move: %s',
      pointerType => {
        const node = ref.current;
        const target = createEventTarget(node);
        target.setBoundingClientRect({x: 0, y: 0, width: 100, height: 100});
        target.pointerdown({pointerType});
        target.pointermove({pointerType, x: 10, y: 10});
        target.pointermove({pointerType, x: 20, y: 20});
        expect(onPressMove).toHaveBeenCalledTimes(2);
        expect(onPressMove).toHaveBeenCalledWith(
          expect.objectContaining({pointerType, type: 'pressmove'}),
        );
      },
    );

    it('is not called if pointer move occurs during keyboard press', () => {
      const target = createEventTarget(ref.current);
      target.setBoundingClientRect({x: 0, y: 0, width: 100, height: 100});
      target.keydown({key: 'Enter'});
      target.pointermove({
        buttons: buttonsType.none,
        pointerType: 'mouse',
        x: 10,
        y: 10,
      });
      expect(onPressMove).not.toBeCalled();
    });
  });

  describe.each(pointerTypesTable)('press with movement: %s', pointerType => {
    let events, ref, outerRef;

    beforeEach(() => {
      events = [];
      ref = React.createRef();
      outerRef = React.createRef();
      const createEventHandler = msg => () => {
        events.push(msg);
      };
      const Component = () => {
        const listener = usePress({
          onPress: createEventHandler('onPress'),
          onPressChange: createEventHandler('onPressChange'),
          onPressMove: createEventHandler('onPressMove'),
          onPressStart: createEventHandler('onPressStart'),
          onPressEnd: createEventHandler('onPressEnd'),
        });
        return (
          <div ref={outerRef}>
            <div ref={ref} listeners={listener} />
          </div>
        );
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    const rectMock = {width: 100, height: 100, x: 50, y: 50};
    const pressRectOffset = 20;
    const coordinatesInside = {
      x: rectMock.x - pressRectOffset,
      y: rectMock.y - pressRectOffset,
    };
    const coordinatesOutside = {
      x: rectMock.x - pressRectOffset - 1,
      y: rectMock.y - pressRectOffset - 1,
    };

    describe('within bounds of hit rect', () => {
      /** ┌──────────────────┐
       *  │  ┌────────────┐  │
       *  │  │ VisualRect │  │
       *  │  └────────────┘  │
       *  │     HitRect    X │ <= Move to X and release
       *  └──────────────────┘
       */
      it('"onPress*" events are called immediately', () => {
        const target = createEventTarget(ref.current);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        target.pointermove({pointerType, ...coordinatesInside});
        target.pointerup({pointerType, ...coordinatesInside});
        expect(events).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressMove',
          'onPressEnd',
          'onPressChange',
          'onPress',
        ]);
      });

      it('"onPress*" events are correctly called with target change', () => {
        const target = createEventTarget(ref.current);
        const outerTarget = createEventTarget(outerRef.current);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        target.pointermove({pointerType, ...coordinatesInside});
        // TODO: this sequence may differ in the future between PointerEvent and mouse fallback when
        // use 'setPointerCapture'.
        if (pointerType === 'touch') {
          target.pointermove({pointerType, ...coordinatesOutside});
        } else {
          outerTarget.pointermove({pointerType, ...coordinatesOutside});
        }
        target.pointermove({pointerType, ...coordinatesInside});
        target.pointerup({pointerType, ...coordinatesInside});

        expect(events.filter(removePressMoveStrings)).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressEnd',
          'onPressChange',
          'onPressStart',
          'onPressChange',
          'onPressEnd',
          'onPressChange',
          'onPress',
        ]);
      });

      it('press retention offset can be configured', () => {
        let localEvents = [];
        const localRef = React.createRef();
        const createEventHandler = msg => () => {
          localEvents.push(msg);
        };
        const pressRetentionOffset = {top: 40, bottom: 40, left: 40, right: 40};

        const Component = () => {
          const listener = usePress({
            onPress: createEventHandler('onPress'),
            onPressChange: createEventHandler('onPressChange'),
            onPressMove: createEventHandler('onPressMove'),
            onPressStart: createEventHandler('onPressStart'),
            onPressEnd: createEventHandler('onPressEnd'),
            pressRetentionOffset,
          });
          return <div ref={localRef} listeners={listener} />;
        };
        ReactDOM.render(<Component />, container);

        const target = createEventTarget(localRef.current);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        target.pointermove({
          pointerType,
          x: rectMock.x,
          y: rectMock.y,
        });
        target.pointerup({pointerType, ...coordinatesInside});
        expect(localEvents).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressMove',
          'onPressEnd',
          'onPressChange',
          'onPress',
        ]);
      });

      it('responder region accounts for decrease in element dimensions', () => {
        const target = createEventTarget(ref.current);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        // emulate smaller dimensions change on activation
        target.setBoundingClientRect({width: 80, height: 80, y: 60, x: 60});
        const coordinates = {x: rectMock.x, y: rectMock.y};
        // move to an area within the pre-activation region
        target.pointermove({pointerType, ...coordinates});
        target.pointerup({pointerType, ...coordinates});
        expect(events).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressMove',
          'onPressEnd',
          'onPressChange',
          'onPress',
        ]);
      });

      it('responder region accounts for increase in element dimensions', () => {
        const target = createEventTarget(ref.current);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        // emulate larger dimensions change on activation
        target.setBoundingClientRect({width: 200, height: 200, y: 0, x: 0});
        const coordinates = {x: rectMock.x - 50, y: rectMock.y - 50};
        // move to an area within the post-activation region
        target.pointermove({pointerType, ...coordinates});
        target.pointerup({pointerType, ...coordinates});
        expect(events).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressMove',
          'onPressEnd',
          'onPressChange',
          'onPress',
        ]);
      });
    });

    describe('beyond bounds of hit rect', () => {
      /** ┌──────────────────┐
       *  │  ┌────────────┐  │
       *  │  │ VisualRect │  │
       *  │  └────────────┘  │
       *  │     HitRect      │
       *  └──────────────────┘
       *                   X   <= Move to X and release
       */
      it('"onPress" is not called on release', () => {
        const target = createEventTarget(ref.current);
        const targetContainer = createEventTarget(container);
        target.setBoundingClientRect(rectMock);
        target.pointerdown({pointerType});
        target.pointermove({pointerType, ...coordinatesInside});
        if (pointerType === 'mouse') {
          // TODO: use setPointerCapture so this is only true for fallback mouse events.
          targetContainer.pointermove({pointerType, ...coordinatesOutside});
          targetContainer.pointerup({pointerType, ...coordinatesOutside});
        } else {
          target.pointermove({pointerType, ...coordinatesOutside});
          target.pointerup({pointerType, ...coordinatesOutside});
        }
        expect(events.filter(removePressMoveStrings)).toEqual([
          'onPressStart',
          'onPressChange',
          'onPressEnd',
          'onPressChange',
        ]);
      });
    });

    it('"onPress" is called on re-entry to hit rect', () => {
      const target = createEventTarget(ref.current);
      const targetContainer = createEventTarget(container);
      target.setBoundingClientRect(rectMock);
      target.pointerdown({pointerType});
      target.pointermove({pointerType, ...coordinatesInside});
      if (pointerType === 'mouse') {
        // TODO: use setPointerCapture so this is only true for fallback mouse events.
        targetContainer.pointermove({pointerType, ...coordinatesOutside});
      } else {
        target.pointermove({pointerType, ...coordinatesOutside});
      }
      target.pointermove({pointerType, ...coordinatesInside});
      target.pointerup({pointerType, ...coordinatesInside});

      expect(events).toEqual([
        'onPressStart',
        'onPressChange',
        'onPressMove',
        'onPressEnd',
        'onPressChange',
        'onPressStart',
        'onPressChange',
        'onPressEnd',
        'onPressChange',
        'onPress',
      ]);
    });
  });

  describe('nested responders', () => {
    if (hasPointerEvents) {
      it('dispatch events in the correct order', () => {
        const events = [];
        const ref = React.createRef();
        const createEventHandler = msg => () => {
          events.push(msg);
        };

        const Inner = () => {
          const listener = usePress({
            onPress: createEventHandler('inner: onPress'),
            onPressChange: createEventHandler('inner: onPressChange'),
            onPressMove: createEventHandler('inner: onPressMove'),
            onPressStart: createEventHandler('inner: onPressStart'),
            onPressEnd: createEventHandler('inner: onPressEnd'),
            stopPropagation: false,
          });
          return (
            <div
              ref={ref}
              listeners={listener}
              onPointerDown={createEventHandler('pointerdown')}
              onPointerUp={createEventHandler('pointerup')}
              onKeyDown={createEventHandler('keydown')}
              onKeyUp={createEventHandler('keyup')}
            />
          );
        };

        const Outer = () => {
          const listener = usePress({
            onPress: createEventHandler('outer: onPress'),
            onPressChange: createEventHandler('outer: onPressChange'),
            onPressMove: createEventHandler('outer: onPressMove'),
            onPressStart: createEventHandler('outer: onPressStart'),
            onPressEnd: createEventHandler('outer: onPressEnd'),
          });
          return (
            <div listeners={listener}>
              <Inner />
            </div>
          );
        };
        ReactDOM.render(<Outer />, container);

        const target = createEventTarget(ref.current);
        target.setBoundingClientRect({x: 0, y: 0, width: 100, height: 100});
        target.pointerdown();
        target.pointerup();
        expect(events).toEqual([
          'inner: onPressStart',
          'inner: onPressChange',
          'pointerdown',
          'inner: onPressEnd',
          'inner: onPressChange',
          'inner: onPress',
          'pointerup',
        ]);
      });
    }

    describe('correctly not propagate', () => {
      it('for onPress', () => {
        const ref = React.createRef();
        const onPress = jest.fn();

        const Inner = () => {
          const listener = usePress({onPress});
          return <div ref={ref} listeners={listener} />;
        };

        const Outer = () => {
          const listener = usePress({onPress});
          return (
            <div listeners={listener}>
              <Inner />
            </div>
          );
        };
        ReactDOM.render(<Outer />, container);

        const target = createEventTarget(ref.current);
        target.setBoundingClientRect({x: 0, y: 0, width: 100, height: 100});
        target.pointerdown();
        target.pointerup();
        expect(onPress).toHaveBeenCalledTimes(1);
      });

      it('for onPressStart/onPressEnd', () => {
        const ref = React.createRef();
        const onPressStart = jest.fn();
        const onPressEnd = jest.fn();

        const Inner = () => {
          const listener = usePress({onPressStart, onPressEnd});
          return <div ref={ref} listeners={listener} />;
        };

        const Outer = () => {
          const listener = usePress({onPressStart, onPressEnd});
          return (
            <div listeners={listener}>
              <Inner />
            </div>
          );
        };
        ReactDOM.render(<Outer />, container);

        const target = createEventTarget(ref.current);
        target.pointerdown();
        expect(onPressStart).toHaveBeenCalledTimes(1);
        expect(onPressEnd).toHaveBeenCalledTimes(0);
        target.pointerup();
        expect(onPressStart).toHaveBeenCalledTimes(1);
        expect(onPressEnd).toHaveBeenCalledTimes(1);
      });

      it('for onPressChange', () => {
        const ref = React.createRef();
        const onPressChange = jest.fn();

        const Inner = () => {
          const listener = usePress({onPressChange});
          return <div ref={ref} listeners={listener} />;
        };

        const Outer = () => {
          const listener = usePress({onPressChange});
          return (
            <div listeners={listener}>
              <Inner />
            </div>
          );
        };
        ReactDOM.render(<Outer />, container);

        const target = createEventTarget(ref.current);
        target.pointerdown();
        expect(onPressChange).toHaveBeenCalledTimes(1);
        target.pointerup();
        expect(onPressChange).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('link components', () => {
    it('prevents native behavior by default', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).toBeCalled();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: true}),
      );
    });

    it('prevents native behaviour for keyboard events by default', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.click({preventDefault});
      target.keyup({key: 'Enter'});
      expect(preventDefault).toBeCalled();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: true}),
      );
    });

    it('deeply prevents native behaviour by default', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const buttonRef = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return (
          <a href="#">
            <button ref={buttonRef} listeners={listener} />
          </a>
        );
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(buttonRef.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).toBeCalled();
    });

    it('prevents native behaviour by default with nested elements', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return (
          <a href="#" listeners={listener}>
            <div ref={ref} />
          </a>
        );
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).toBeCalled();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: true}),
      );
    });

    it('uses native behaviour for interactions with modifier keys', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      ['metaKey', 'ctrlKey', 'shiftKey'].forEach(modifierKey => {
        const target = createEventTarget(ref.current);
        target.pointerdown({[modifierKey]: true});
        target.pointerup({[modifierKey]: true, preventDefault});
        expect(preventDefault).not.toBeCalled();
        expect(onPress).toHaveBeenCalledWith(
          expect.objectContaining({defaultPrevented: false}),
        );
      });
    });

    it('uses native behaviour for pointer events if preventDefault is false', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress, preventDefault: false});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).not.toBeCalled();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: false}),
      );
    });

    it('uses native behaviour for keyboard events if preventDefault is false', () => {
      const onPress = jest.fn();
      const preventDefault = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPress, preventDefault: false});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.keydown({key: 'Enter'});
      target.click({preventDefault});
      target.keyup({key: 'Enter'});
      expect(preventDefault).not.toBeCalled();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: false}),
      );
    });
  });

  describe('responder cancellation', () => {
    it.each(pointerTypesTable)('ends on pointer cancel', pointerType => {
      const onPressEnd = jest.fn();
      const ref = React.createRef();

      const Component = () => {
        const listener = usePress({onPressEnd});
        return <a href="#" ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType});
      target.pointercancel({pointerType});
      expect(onPressEnd).toHaveBeenCalledTimes(1);
    });
  });

  it('does end on "scroll" to document (not mouse)', () => {
    const onPressEnd = jest.fn();
    const ref = React.createRef();

    const Component = () => {
      const listener = usePress({onPressEnd});
      return <a href="#" ref={ref} listeners={listener} />;
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    const targetDocument = createEventTarget(document);
    target.pointerdown({pointerType: 'touch'});
    targetDocument.scroll();
    expect(onPressEnd).toHaveBeenCalledTimes(1);
  });

  it('does end on "scroll" to a parent container (not mouse)', () => {
    const onPressEnd = jest.fn();
    const ref = React.createRef();
    const containerRef = React.createRef();

    const Component = () => {
      const listener = usePress({onPressEnd});
      return (
        <div ref={containerRef}>
          <a ref={ref} listeners={listener} />
        </div>
      );
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    const targetContainer = createEventTarget(containerRef.current);
    target.pointerdown({pointerType: 'touch'});
    targetContainer.scroll();
    expect(onPressEnd).toHaveBeenCalledTimes(1);
  });

  it('does not end on "scroll" to an element outside', () => {
    const onPressEnd = jest.fn();
    const ref = React.createRef();
    const outsideRef = React.createRef();

    const Component = () => {
      const listener = usePress({onPressEnd});
      return (
        <div>
          <a ref={ref} listeners={listener} />
          <span ref={outsideRef} />
        </div>
      );
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    const targetOutside = createEventTarget(outsideRef.current);
    target.pointerdown();
    targetOutside.scroll();
    expect(onPressEnd).not.toBeCalled();
  });

  it('expect displayName to show up for event component', () => {
    expect(PressResponder.displayName).toBe('Press');
  });

  it('should not trigger an invariant in addRootEventTypes()', () => {
    const ref = React.createRef();

    const Component = () => {
      const listener = usePress();
      return <button ref={ref} listeners={listener} />;
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    target.pointerdown();
    target.pointermove();
    target.pointerup();
    target.pointerdown();
  });

  it('should correctly pass through event properties', () => {
    const timeStamps = [];
    const ref = React.createRef();
    const eventLog = [];
    const logEvent = event => {
      const propertiesWeCareAbout = {
        pageX: event.pageX,
        pageY: event.pageY,
        screenX: event.screenX,
        screenY: event.screenY,
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
        target: event.target,
        timeStamp: event.timeStamp,
        type: event.type,
      };
      timeStamps.push(event.timeStamp);
      eventLog.push(propertiesWeCareAbout);
    };

    const Component = () => {
      const listener = usePress({
        onPressStart: logEvent,
        onPressEnd: logEvent,
        onPressMove: logEvent,
        onPress: logEvent,
      });
      return <button ref={ref} listeners={listener} />;
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    target.setBoundingClientRect({x: 10, y: 10, width: 100, height: 100});
    target.pointerdown({
      pointerType: 'mouse',
      pageX: 15,
      pageY: 16,
      x: 30,
      y: 31,
    });
    target.pointermove({
      pointerType: 'mouse',
      pageX: 16,
      pageY: 17,
      x: 31,
      y: 32,
    });
    target.pointerup({
      pointerType: 'mouse',
      pageX: 17,
      pageY: 18,
      x: 32,
      y: 33,
    });
    target.pointerdown({
      pointerType: 'mouse',
      pageX: 18,
      pageY: 19,
      x: 33,
      y: 34,
    });
    expect(typeof timeStamps[0] === 'number').toBe(true);
    expect(eventLog).toEqual([
      {
        pointerType: 'mouse',
        pageX: 15,
        pageY: 16,
        screenX: 30,
        screenY: 81,
        clientX: 30,
        clientY: 31,
        target: ref.current,
        timeStamp: timeStamps[0],
        type: 'pressstart',
      },
      {
        pointerType: 'mouse',
        pageX: 16,
        pageY: 17,
        screenX: 31,
        screenY: 82,
        clientX: 31,
        clientY: 32,
        target: ref.current,
        timeStamp: timeStamps[1],
        type: 'pressmove',
      },
      {
        pointerType: 'mouse',
        pageX: 17,
        pageY: 18,
        screenX: 32,
        screenY: 83,
        clientX: 32,
        clientY: 33,
        target: ref.current,
        timeStamp: timeStamps[2],
        type: 'pressend',
      },
      {
        pointerType: 'mouse',
        pageX: 17,
        pageY: 18,
        screenX: 32,
        screenY: 83,
        clientX: 32,
        clientY: 33,
        target: ref.current,
        timeStamp: timeStamps[3],
        type: 'press',
      },
      {
        pointerType: 'mouse',
        pageX: 18,
        pageY: 19,
        screenX: 33,
        screenY: 84,
        clientX: 33,
        clientY: 34,
        target: ref.current,
        timeStamp: timeStamps[4],
        type: 'pressstart',
      },
    ]);
  });

  if (hasPointerEvents) {
    // TODO(T46067442): move these tests to core
    /*
    it('should properly only flush sync once when the event systems are mixed', () => {
      const ref = React.createRef();
      let renderCounts = 0;

      function MyComponent() {
        const [, updateCounter] = React.useState(0);
        renderCounts++;

        function handlePress() {
          updateCounter(count => count + 1);
        }

        const listener = usePress({
          onPress: handlePress,
        });

        return (
          <div>
            <button
              ref={ref}
              listeners={listener}
              onClick={() => {
                updateCounter(count => count + 1);
              }}>
              Press me
            </button>
          </div>
        );
      }

      const newContainer = document.createElement('div');
      const root = ReactDOM.unstable_createRoot(newContainer);
      document.body.appendChild(newContainer);
      root.render(<MyComponent />);
      Scheduler.unstable_flushAll();

      const target = ref.current;
      target.dispatchEvent(pointerdown({timeStamp: 100}));
      target.dispatchEvent(pointerup({timeStamp: 100}));
      target.dispatchEvent(click({timeStamp: 100}));

      if (__DEV__) {
        expect(renderCounts).toBe(2);
      } else {
        expect(renderCounts).toBe(1);
      }
      Scheduler.unstable_flushAll();
      if (__DEV__) {
        expect(renderCounts).toBe(4);
      } else {
        expect(renderCounts).toBe(2);
      }

      target.dispatchEvent(pointerdown({timeStamp: 100}));
      target.dispatchEvent(pointerup({timeStamp: 100}));
      // Ensure the timeStamp logic works
      target.dispatchEvent(click({timeStamp: 101}));

      if (__DEV__) {
        expect(renderCounts).toBe(6);
      } else {
        expect(renderCounts).toBe(3);
      }

      Scheduler.unstable_flushAll();
      document.body.removeChild(newContainer);
    });

    it('should properly flush sync when the event systems are mixed with unstable_flushDiscreteUpdates', () => {
      const ref = React.createRef();
      let renderCounts = 0;

      function MyComponent() {
        const [, updateCounter] = React.useState(0);
        renderCounts++;

        function handlePress() {
          updateCounter(count => count + 1);
        }

        const listener = usePress({
          onPress: handlePress,
        });

        return (
          <div>
            <button
              ref={ref}
              listeners={listener}
              onClick={() => {
                // This should flush synchronously
                ReactDOM.unstable_flushDiscreteUpdates();
                updateCounter(count => count + 1);
              }}>
              Press me
            </button>
          </div>
        );
      }

      const newContainer = document.createElement('div');
      const root = ReactDOM.unstable_createRoot(newContainer);
      document.body.appendChild(newContainer);
      root.render(<MyComponent />);
      Scheduler.unstable_flushAll();

      const target = ref.current;
      target.dispatchEvent(pointerdown({timeStamp: 100}));
      target.dispatchEvent(pointerup({timeStamp: 100}));
      target.dispatchEvent(click({timeStamp: 100}));

      if (__DEV__) {
        expect(renderCounts).toBe(4);
      } else {
        expect(renderCounts).toBe(2);
      }
      Scheduler.unstable_flushAll();
      if (__DEV__) {
        expect(renderCounts).toBe(6);
      } else {
        expect(renderCounts).toBe(3);
      }

      target.dispatchEvent(pointerdown({timeStamp: 100}));
      target.dispatchEvent(pointerup({timeStamp: 100}));
      // Ensure the timeStamp logic works
      target.dispatchEvent(click({timeStamp: 101}));

      if (__DEV__) {
        expect(renderCounts).toBe(8);
      } else {
        expect(renderCounts).toBe(4);
      }

      Scheduler.unstable_flushAll();
      document.body.removeChild(newContainer);
    });

    it(
      'should only flush before outermost discrete event handler when mixing ' +
        'event systems',
      async () => {
        const {useState} = React;

        const button = React.createRef();

        const ops = [];

        function MyComponent() {
          const [pressesCount, updatePressesCount] = useState(0);
          const [clicksCount, updateClicksCount] = useState(0);

          function handlePress() {
            // This dispatches a synchronous, discrete event in the legacy event
            // system. However, because it's nested inside the new event system,
            // its updates should not flush until the end of the outer handler.
            button.current.click();
            // Text context should not have changed
            ops.push(newContainer.textContent);
            updatePressesCount(pressesCount + 1);
          }

          const listener = usePress({
            onPress: handlePress,
          });

          return (
            <div>
              <button
                listeners={listener}
                ref={button}
                onClick={() => updateClicksCount(clicksCount + 1)}>
                Presses: {pressesCount}, Clicks: {clicksCount}
              </button>
            </div>
          );
        }

        const newContainer = document.createElement('div');
        document.body.appendChild(newContainer);
        const root = ReactDOM.unstable_createRoot(newContainer);

        root.render(<MyComponent />);
        Scheduler.unstable_flushAll();
        expect(newContainer.textContent).toEqual('Presses: 0, Clicks: 0');

        const target = button.current;
        target.dispatchEvent(pointerdown({timeStamp: 100}));
        target.dispatchEvent(pointerup({timeStamp: 100}));
        target.dispatchEvent(click({timeStamp: 100}));

        Scheduler.unstable_flushAll();
        expect(newContainer.textContent).toEqual('Presses: 1, Clicks: 1');

        expect(ops).toEqual(['Presses: 0, Clicks: 0']);
      },
    );
    */
    it('should work correctly with stopPropagation set to true', () => {
      const ref = React.createRef();
      const pointerDownEvent = jest.fn();

      const Component = () => {
        const listener = usePress({stopPropagation: true});
        return <div ref={ref} listeners={listener} />;
      };

      container.addEventListener('pointerdown', pointerDownEvent);
      ReactDOM.render(<Component />, container);
      createEventTarget(ref.current).pointerdown();
      container.removeEventListener('pointerdown', pointerDownEvent);
      expect(pointerDownEvent).toHaveBeenCalledTimes(0);
    });
  }
});
