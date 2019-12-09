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
  buttonType,
  buttonsType,
  createEventTarget,
  describeWithPointerEvent,
  setPointerEvent,
  testWithPointerType,
} from '../testing-library';

let React;
let ReactFeatureFlags;
let ReactDOM;
let useTap;

function initializeModules(hasPointerEvents) {
  jest.resetModules();
  setPointerEvent(hasPointerEvents);
  ReactFeatureFlags = require('shared/ReactFeatureFlags');
  ReactFeatureFlags.enableFlareAPI = true;
  React = require('react');
  ReactDOM = require('react-dom');
  useTap = require('react-interactions/events/tap').useTap;
}

const coordinatesInside = {x: 51, y: 51};
const coordinatesOutside = {x: 49, y: 49};

function tapAndMoveOutside({
  hasPointerEvents,
  pointerType,
  downTarget,
  upTarget,
}) {
  downTarget.setBoundingClientRect({width: 100, height: 100, x: 50, y: 50});
  downTarget.pointerdown({pointerType, ...coordinatesInside});
  downTarget.pointermove({pointerType, ...coordinatesInside});
  // NOTE: this assumes the PointerEvent implementation calls
  // 'releasePointerCapture' for touch pointers
  if (!hasPointerEvents && pointerType === 'touch') {
    document.elementFromPoint = () => upTarget.node;
    downTarget.pointermove({pointerType, ...coordinatesOutside});
  } else {
    upTarget.pointermove({pointerType, ...coordinatesOutside});
  }
}

function tapAndReleaseOutside({
  hasPointerEvents,
  pointerType,
  downTarget,
  upTarget,
}) {
  tapAndMoveOutside({hasPointerEvents, pointerType, downTarget, upTarget});
  if (!hasPointerEvents && pointerType === 'touch') {
    downTarget.pointerup({pointerType, ...coordinatesOutside});
  } else {
    upTarget.pointerup({pointerType, ...coordinatesOutside});
  }
}

describeWithPointerEvent('Tap responder', hasPointerEvents => {
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

  test('supports repeated use', () => {
    const ref = React.createRef();
    const Component = () => {
      const listener = useTap();
      return <button ref={ref} DEPRECATED_flareListeners={listener} />;
    };
    ReactDOM.render(<Component />, container);

    const target = createEventTarget(ref.current);
    function interact() {
      target.pointerdown();
      target.pointermove();
      target.pointerup();
    }
    expect(() => {
      interact();
      interact();
    }).not.toThrow();
  });

  describe('disabled', () => {
    let onTapStart, onTapChange, onTapUpdate, onTapCancel, onTapEnd, ref;

    beforeEach(() => {
      onTapStart = jest.fn();
      onTapChange = jest.fn();
      onTapUpdate = jest.fn();
      onTapCancel = jest.fn();
      onTapEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({
          disabled: true,
          onTapStart,
          onTapChange,
          onTapUpdate,
          onTapCancel,
          onTapEnd,
        });
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
    });

    test('does not call callbacks', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup();
      expect(onTapStart).not.toBeCalled();
      expect(onTapChange).not.toBeCalled();
      expect(onTapUpdate).not.toBeCalled();
      expect(onTapCancel).not.toBeCalled();
      expect(onTapEnd).not.toBeCalled();
    });
  });

  describe('maximumDistance', () => {
    let onTapCancel, onTapUpdate, ref;

    function render(props) {
      const Component = () => {
        const listener = useTap(props);
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    }

    beforeEach(() => {
      onTapCancel = jest.fn();
      onTapUpdate = jest.fn();
      ref = React.createRef();
      render({
        maximumDistance: 20,
        onTapCancel,
        onTapUpdate,
      });
    });

    test('ignores values less than 10', () => {
      render({
        maximumDistance: 5,
        onTapCancel,
        onTapUpdate,
      });
      const target = createEventTarget(ref.current);
      const pointerType = 'mouse';
      target.pointerdown({pointerType, x: 0, y: 0});
      target.pointermove({pointerType, x: 10, y: 10});
      expect(onTapUpdate).toHaveBeenCalledTimes(1);
      expect(onTapCancel).toHaveBeenCalledTimes(0);
    });

    testWithPointerType('below threshold', pointerType => {
      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType, x: 0, y: 0});
      target.pointermove({pointerType, x: 10, y: 10});
      expect(onTapUpdate).toHaveBeenCalledTimes(1);
      expect(onTapCancel).toHaveBeenCalledTimes(0);
    });

    testWithPointerType('above threshold', pointerType => {
      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType, x: 0, y: 0});
      target.pointermove({pointerType, x: 15, y: 14});
      expect(onTapUpdate).toHaveBeenCalledTimes(0);
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAuxiliaryTap', () => {
    let onAuxiliaryTap, ref;

    beforeEach(() => {
      onAuxiliaryTap = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({onAuxiliaryTap});
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    test('auxiliary-button pointer up', () => {
      const pointerType = 'mouse';
      const button = buttonType.auxiliary;
      const buttons = buttonsType.auxiliary;
      const target = createEventTarget(ref.current);
      target.pointerdown({button, buttons, pointerType});
      target.pointerup({button, buttons, pointerType});
      expect(onAuxiliaryTap).toHaveBeenCalledTimes(1);
    });

    test('modifier-button pointer up', () => {
      const pointerType = 'mouse';
      const button = buttonType.primary;
      const buttons = buttonsType.primary;
      const target = createEventTarget(ref.current);
      target.pointerdown({button, buttons, pointerType});
      target.pointerup({button, buttons, metaKey: true, pointerType});
      expect(onAuxiliaryTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('onTapStart', () => {
    let onTapStart, ref;

    beforeEach(() => {
      onTapStart = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({onTapStart});
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    testWithPointerType('pointer down', pointerType => {
      const target = createEventTarget(ref.current);
      const nativeEvent = {
        button: buttonType.primary,
        buttons: buttonsType.primary,
        pageX: 10,
        pageY: 10,
        pointerType,
        x: 10,
        y: 10,
      };
      target.pointerdown(nativeEvent);
      // 'pointerup' is only for the MouseEvent/TouchEvent fallback
      // implementation. We also dispatch 'pointerup' so that this test covers
      // the case where browsers dispatch an emulated mousedown (and mouseup)
      // event *after* a touch ends.
      target.pointerup(nativeEvent);
      expect(onTapStart).toHaveBeenCalledTimes(1);
      expect(onTapStart).toHaveBeenCalledWith(
        expect.objectContaining({
          altKey: false,
          ctrlKey: false,
          height: pointerType === 'mouse' ? 1 : 23,
          metaKey: false,
          pageX: 10,
          pageY: 10,
          pointerType,
          pressure: pointerType === 'touch' ? 1 : 0.5,
          screenX: 10,
          screenY: 60,
          shiftKey: false,
          tangentialPressure: 0,
          target: target.node,
          tiltX: 0,
          tiltY: 0,
          timeStamp: expect.any(Number),
          twist: 0,
          type: 'tap:start',
          width: pointerType === 'mouse' ? 1 : 23,
          x: 10,
          y: 10,
        }),
      );
    });

    test('second pointer on target', () => {
      const pointerType = 'touch';
      const target = createEventTarget(ref.current);
      const button = buttonType.primary;
      const buttons = buttonsType.primary;
      target.pointerdown({button, buttons, pointerId: 1, pointerType});
      expect(onTapStart).toHaveBeenCalledTimes(1);
      if (hasPointerEvents) {
        target.pointerdown({button, buttons, pointerId: 2, pointerType});
      } else {
        // TouchEvents
        target.pointerdown([{pointerId: 1}, {pointerId: 2}]);
      }
      expect(onTapStart).toHaveBeenCalledTimes(1);
    });

    testWithPointerType('ignored buttons and modifiers', pointerType => {
      const target = createEventTarget(ref.current);
      if (pointerType !== 'touch') {
        // right-click
        target.pointerdown({
          button: buttonType.secondary,
          buttons: buttonsType.secondary,
          pointerType,
        });
        target.pointerup();
        // middle-click
        target.pointerdown({
          button: buttonType.auxiliary,
          buttons: buttonsType.auxiliary,
          pointerType,
        });
        target.pointerup();
        // virtual middle-click with misleading 'buttons' value
        target.pointerdown({
          button: buttonType.auxiliary,
          buttons: 0,
          pointerType,
        });
        target.pointerup();
        // pen eraser
        target.pointerdown({
          button: buttonType.eraser,
          buttons: buttonsType.eraser,
          pointerType,
        });
        target.pointerup();
      }
      // alt-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
        altKey: true,
        pointerType,
      });
      target.pointerup();
      // ctrl-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
        ctrlKey: true,
        pointerType,
      });
      target.pointerup();
      // meta-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
        metaKey: true,
        pointerType,
      });
      target.pointerup();
      // shift-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
        shiftKey: true,
        pointerType,
      });
      target.pointerup();

      expect(onTapStart).toHaveBeenCalledTimes(0);
    });
  });

  describe('onTapEnd', () => {
    let onTapEnd, ref;

    beforeEach(() => {
      onTapEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({onTapEnd});
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    testWithPointerType('pointer up', pointerType => {
      const target = createEventTarget(ref.current);
      const button = buttonType.primary;
      const buttons = buttonsType.primary;
      target.pointerdown({button, buttons, pointerType});
      target.pointerup({
        button,
        buttons,
        pageX: 10,
        pageY: 10,
        pointerType,
        x: 10,
        y: 10,
      });
      expect(onTapEnd).toHaveBeenCalledTimes(1);
      expect(onTapEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          altKey: false,
          ctrlKey: false,
          height: pointerType === 'mouse' ? 1 : 23,
          metaKey: false,
          pageX: 10,
          pageY: 10,
          pointerType,
          pressure: 0,
          screenX: 10,
          screenY: 60,
          shiftKey: false,
          tangentialPressure: 0,
          target: target.node,
          tiltX: 0,
          tiltY: 0,
          timeStamp: expect.any(Number),
          twist: 0,
          type: 'tap:end',
          width: pointerType === 'mouse' ? 1 : 23,
          x: 10,
          y: 10,
        }),
      );
    });

    testWithPointerType('zero-dimension hit rect', pointerType => {
      const targetRef = React.createRef();
      const innerRef = React.createRef();

      const Component = () => {
        const listener = useTap({onTapEnd});
        return (
          <div ref={targetRef} DEPRECATED_flareListeners={listener}>
            <button ref={innerRef} />
          </div>
        );
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => innerRef.current;

      const target = createEventTarget(targetRef.current);
      target.setBoundingClientRect({x: 0, y: 0, width: 0, height: 0});
      const innerTarget = createEventTarget(innerRef.current);
      innerTarget.pointerdown({pointerType});
      innerTarget.pointerup({pointerType});
      expect(onTapEnd).toBeCalled();
    });

    testWithPointerType('pointer up outside target', pointerType => {
      const downTarget = createEventTarget(ref.current);
      const upTarget = createEventTarget(container);
      tapAndReleaseOutside({
        hasPointerEvents,
        downTarget,
        upTarget,
        pointerType,
      });
      expect(onTapEnd).not.toBeCalled();
    });

    if (hasPointerEvents) {
      test('second pointer up off target', () => {
        const pointerType = 'touch';
        const target = createEventTarget(ref.current);
        const offTarget = createEventTarget(container);
        const button = buttonType.primary;
        const buttons = buttonsType.primary;

        target.pointerdown({button, buttons, pointerId: 1, pointerType});
        offTarget.pointerdown({button, buttons, pointerId: 2, pointerType});
        offTarget.pointerup({
          button,
          buttons,
          pageX: 10,
          pageY: 10,
          pointerId: 2,
          pointerType,
          x: 10,
          y: 10,
        });
        expect(onTapEnd).toHaveBeenCalledTimes(0);
      });
    }

    test('ignored buttons and modifiers', () => {
      const target = createEventTarget(ref.current);
      // right-click
      target.pointerdown({
        button: buttonType.secondary,
        buttons: buttonsType.secondary,
      });
      target.pointerup({
        button: buttonType.secondary,
        buttons: buttonsType.secondary,
      });
      // middle-click
      target.pointerdown({
        button: buttonType.auxiliary,
        buttons: buttonsType.auxiliary,
      });
      target.pointerup({
        button: buttonType.auxiliary,
        buttons: buttonsType.auxiliary,
      });
      // pen eraser
      target.pointerdown({
        button: buttonType.eraser,
        buttons: buttonsType.eraser,
      });
      target.pointerup({
        button: buttonType.eraser,
        buttons: buttonsType.eraser,
      });
      // alt-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
      });
      target.pointerup({altKey: true, button: buttonType.primary});
      // ctrl-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
      });
      target.pointerup({ctrlKey: true, button: buttonType.primary});
      // meta-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
      });
      target.pointerup({metaKey: true, button: buttonType.primary});
      // shift-click
      target.pointerdown({
        button: buttonType.primary,
        buttons: buttonsType.primary,
      });
      target.pointerup({shiftKey: true, button: buttonType.primary});

      expect(onTapEnd).toHaveBeenCalledTimes(0);
    });
  });

  describe('onTapUpdate', () => {
    let onTapUpdate, ref;
    const rect = {x: 0, y: 0, width: 100, height: 100};
    const coordinates = {x: 10, y: 10};

    beforeEach(() => {
      onTapUpdate = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({onTapUpdate});
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    testWithPointerType('requires activation', pointerType => {
      const target = createEventTarget(ref.current);
      target.setBoundingClientRect(rect);
      target.pointerhover({pointerType, ...coordinates});
      target.pointermove({pointerType, ...coordinates});
      expect(onTapUpdate).not.toBeCalled();
    });

    testWithPointerType('pointer move', pointerType => {
      const target = createEventTarget(ref.current);
      target.setBoundingClientRect(rect);
      target.pointerdown({pointerType});

      target.pointermove({pointerType, x: 10, y: 10});
      expect(onTapUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          altKey: false,
          ctrlKey: false,
          height: pointerType === 'mouse' ? 1 : 23,
          metaKey: false,
          pageX: 10,
          pageY: 10,
          pointerType,
          pressure: pointerType === 'touch' ? 1 : 0.5,
          screenX: 10,
          screenY: 60,
          shiftKey: false,
          tangentialPressure: 0,
          target: target.node,
          tiltX: 0,
          tiltY: 0,
          timeStamp: expect.any(Number),
          twist: 0,
          type: 'tap:update',
          width: pointerType === 'mouse' ? 1 : 23,
          x: 10,
          y: 10,
        }),
      );

      target.pointermove({pointerType, x: 20, y: 20});
      expect(onTapUpdate).toHaveBeenCalledWith(
        expect.objectContaining({pointerType, x: 20, y: 20}),
      );

      expect(onTapUpdate).toHaveBeenCalledTimes(2);
    });

    testWithPointerType('pointer moves outside target', pointerType => {
      const target = createEventTarget(ref.current);
      const containerTarget = createEventTarget(container);
      target.setBoundingClientRect(rect);
      target.pointerdown({pointerType});
      target.pointermove({pointerType, x: 10, y: 10});
      expect(onTapUpdate).toHaveBeenCalledTimes(1);

      // NOTE: this assumes the PointerEvent implementation calls
      // 'releasePointerCapture' for touch pointers
      if (!hasPointerEvents && pointerType === 'touch') {
        document.elementFromPoint = () => containerTarget.node;
        target.pointermove({pointerType, x: 101, y: 101});
      } else {
        containerTarget.pointermove({pointerType, x: 101, y: 101});
      }

      // No extra 'onTapUpdate' calls when the pointer is outside the target
      expect(onTapUpdate).toHaveBeenCalledTimes(1);
    });

    if (hasPointerEvents) {
      test('second pointer off target', () => {
        const pointerType = 'touch';
        const target = createEventTarget(ref.current);
        const offTarget = createEventTarget(container);
        const button = buttonType.primary;
        const buttons = buttonsType.primary;
        target.pointerdown({button, buttons, pointerId: 1, pointerType});
        offTarget.pointerdown({button, buttons, pointerId: 2, pointerType});
        target.pointermove({pointerId: 1, pointerType, x: 10, y: 10});
        expect(onTapUpdate).toHaveBeenCalledTimes(1);
        offTarget.pointermove({pointerId: 2, pointerType, x: 10, y: 10});
        expect(onTapUpdate).toHaveBeenCalledTimes(1);
      });
    }
  });

  describe('onTapChange', () => {
    let eventsLog, onTapChange, ref;

    const logger = msg => () => {
      eventsLog.push(msg);
    };

    beforeEach(() => {
      eventsLog = [];
      onTapChange = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useTap({
          onTapChange(e) {
            logger('change')();
            onTapChange(e);
          },
          onTapStart: logger('start'),
          onTapEnd: logger('end'),
          onTapCancel: logger('cancel'),
        });
        return <div ref={ref} DEPRECATED_flareListeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
      document.elementFromPoint = () => ref.current;
    });

    testWithPointerType('pointer down/up', pointerType => {
      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType});
      expect(onTapChange).toHaveBeenCalledTimes(1);
      expect(onTapChange).toHaveBeenCalledWith(true);
      target.pointerup({pointerType, x: 0, y: 0});
      expect(onTapChange).toHaveBeenCalledTimes(2);
      expect(onTapChange).toHaveBeenCalledWith(false);
      expect(eventsLog).toEqual(['start', 'change', 'change', 'end']);
    });

    testWithPointerType('pointer cancel', pointerType => {
      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType});
      expect(onTapChange).toHaveBeenCalledTimes(1);
      expect(onTapChange).toHaveBeenCalledWith(true);
      target.pointercancel({pointerType});
      expect(onTapChange).toHaveBeenCalledTimes(2);
      expect(onTapChange).toHaveBeenCalledWith(false);
      expect(eventsLog).toEqual(['start', 'change', 'change', 'cancel']);
    });

    testWithPointerType('pointer move outside target', pointerType => {
      const downTarget = createEventTarget(ref.current);
      const upTarget = createEventTarget(container);
      tapAndMoveOutside({
        hasPointerEvents,
        downTarget,
        upTarget,
        pointerType,
      });
      expect(onTapChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('onTapCancel', () => {
    let onTapCancel, onTapUpdate, parentRef, ref, siblingRef;

    beforeEach(() => {
      onTapCancel = jest.fn();
      onTapUpdate = jest.fn();
      parentRef = React.createRef();
      ref = React.createRef();
      siblingRef = React.createRef();
      const Component = () => {
        const listener = useTap({onTapCancel, onTapUpdate});
        return (
          <div ref={parentRef}>
            <div ref={ref} DEPRECATED_flareListeners={listener} />
            <span ref={siblingRef} />
          </div>
        );
      };
      ReactDOM.render(<Component />, container);
    });

    testWithPointerType('pointer cancel', pointerType => {
      const target = createEventTarget(ref.current);
      target.pointerdown({pointerType});
      target.pointercancel({pointerType});
      expect(onTapCancel).toHaveBeenCalledTimes(1);
      expect(onTapCancel).toHaveBeenCalledWith(
        expect.objectContaining({
          altKey: false,
          ctrlKey: false,
          height: 1,
          metaKey: false,
          pageX: 0,
          pageY: 0,
          pointerType,
          pressure: 0,
          screenX: 0,
          screenY: 0,
          shiftKey: false,
          tangentialPressure: 0,
          target: target.node,
          tiltX: 0,
          tiltY: 0,
          timeStamp: expect.any(Number),
          twist: 0,
          type: 'tap:cancel',
          width: 1,
          x: 0,
          y: 0,
        }),
      );
      target.pointermove({pointerType, x: 5, y: 5});
      expect(onTapUpdate).not.toBeCalled();
    });

    test('second pointer on target', () => {
      const pointerType = 'touch';
      const target = createEventTarget(ref.current);
      const button = buttonType.primary;
      const buttons = buttonsType.primary;
      target.pointerdown({button, buttons, pointerId: 1, pointerType});
      if (hasPointerEvents) {
        target.pointerdown({button, buttons, pointerId: 2, pointerType});
      } else {
        // TouchEvents
        target.pointerdown([{pointerId: 1}, {pointerId: 2}]);
      }
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });

    if (hasPointerEvents) {
      test('second pointer off target', () => {
        const pointerType = 'touch';
        const target = createEventTarget(ref.current);
        const offTarget = createEventTarget(container);
        const button = buttonType.primary;
        const buttons = buttonsType.primary;
        target.pointerdown({button, buttons, pointerId: 1, pointerType});
        offTarget.pointerdown({button, buttons, pointerId: 2, pointerType});
        expect(onTapCancel).toHaveBeenCalledTimes(0);
      });
    }

    testWithPointerType('pointer move outside target', pointerType => {
      const downTarget = createEventTarget(ref.current);
      const upTarget = createEventTarget(container);
      tapAndMoveOutside({
        hasPointerEvents,
        downTarget,
        upTarget,
        pointerType,
      });
      expect(onTapCancel).toBeCalled();
    });

    test('ignored modifiers', () => {
      const target = createEventTarget(ref.current);
      const button = buttonType.primary;
      const buttons = buttonsType.primary;
      // alt-click
      target.pointerdown({button, buttons});
      target.pointerup({altKey: true, button});
      // ctrl-click
      target.pointerdown({button, buttons});
      target.pointerup({ctrlKey: true, button});
      // meta-click
      target.pointerdown({button, buttons});
      target.pointerup({metaKey: true, button});
      // shift-click
      target.pointerdown({buttons});
      target.pointerup({shiftKey: true, button});

      expect(onTapCancel).toHaveBeenCalledTimes(4);
    });

    test('long press context menu', () => {
      const target = createEventTarget(ref.current);
      target.contextmenu({}, {pointerType: 'touch'});
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });

    test('parent scroll (non-mouse)', () => {
      const target = createEventTarget(ref.current);
      const parentTarget = createEventTarget(parentRef.current);
      target.pointerdown({pointerType: 'touch'});
      parentTarget.scroll();
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });

    test('sibling scroll', () => {
      const target = createEventTarget(ref.current);
      const siblingTarget = createEventTarget(siblingRef.current);
      target.pointerdown();
      siblingTarget.scroll();
      expect(onTapCancel).not.toBeCalled();
    });

    test('document scroll (non-mouse)', () => {
      const target = createEventTarget(ref.current);
      const documentTarget = createEventTarget(document);
      target.pointerdown({pointerType: 'touch'});
      documentTarget.scroll();
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });

    // Scroll on an element not managed by React
    test('root container scroll (non-mouse)', () => {
      const target = createEventTarget(ref.current);
      const containerTarget = createEventTarget(container);
      target.pointerdown({pointerType: 'touch'});
      containerTarget.scroll();
      expect(onTapCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('preventDefault', () => {
    let onTapEnd, ref, innerRef, preventDefault, remount;

    beforeEach(() => {
      remount = function(shouldPreventDefault) {
        onTapEnd = jest.fn();
        preventDefault = jest.fn();
        ref = React.createRef();
        innerRef = React.createRef();
        const Component = () => {
          const listener = useTap({
            onTapEnd,
            preventDefault: shouldPreventDefault,
          });
          return (
            <a href="#" ref={ref} DEPRECATED_flareListeners={listener}>
              <div ref={innerRef} />
            </a>
          );
        };
        ReactDOM.render(<Component />, container);
      };
      remount();
    });

    test('prevents native behavior by default', () => {
      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).toBeCalled();
      expect(onTapEnd).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: true}),
      );
    });

    test('prevents native behaviour by default (inner target)', () => {
      const innerTarget = createEventTarget(innerRef.current);
      innerTarget.pointerdown();
      innerTarget.pointerup({preventDefault});
      expect(preventDefault).toBeCalled();
      expect(onTapEnd).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: true}),
      );
    });

    test('allows native behaviour if false', () => {
      remount(false);

      const target = createEventTarget(ref.current);
      target.pointerdown();
      target.pointerup({preventDefault});
      expect(preventDefault).not.toBeCalled();
      expect(onTapEnd).toHaveBeenCalledWith(
        expect.objectContaining({defaultPrevented: false}),
      );
    });
  });
});
