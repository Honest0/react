/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactStrictMode', () => {
  let React;
  let ReactDOM;
  let act;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');

    const TestUtils = require('react-dom/test-utils');
    act = TestUtils.unstable_concurrentAct;

    const ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableStrictEffects = __DEV__;
  });

  describe('levels', () => {
    let log;

    beforeEach(() => {
      log = [];
    });

    function Component({label}) {
      React.useEffect(() => {
        log.push(`${label}: useEffect mount`);
        return () => log.push(`${label}: useEffect unmount`);
      });

      React.useLayoutEffect(() => {
        log.push(`${label}: useLayoutEffect mount`);
        return () => log.push(`${label}: useLayoutEffect unmount`);
      });

      log.push(`${label}: render`);

      return null;
    }

    // @gate experimental
    it('should default to not strict', () => {
      act(() => {
        const container = document.createElement('div');
        const root = ReactDOM.createRoot(container);
        root.render(<Component label="A" />);
      });

      expect(log).toEqual([
        'A: render',
        'A: useLayoutEffect mount',
        'A: useEffect mount',
      ]);
    });

    if (__DEV__) {
      // @gate experimental
      it('should support enabling strict mode via createRoot option', () => {
        act(() => {
          const container = document.createElement('div');
          const root = ReactDOM.createRoot(container, {
            unstable_strictMode: true,
          });
          root.render(<Component label="A" />);
        });

        expect(log).toEqual([
          'A: render',
          'A: render',
          'A: useLayoutEffect mount',
          'A: useEffect mount',
          'A: useLayoutEffect unmount',
          'A: useEffect unmount',
          'A: useLayoutEffect mount',
          'A: useEffect mount',
        ]);
      });

      // @gate experimental
      it('should include legacy + strict effects mode', () => {
        act(() => {
          const container = document.createElement('div');
          const root = ReactDOM.createRoot(container);
          root.render(
            <React.StrictMode>
              <Component label="A" />
            </React.StrictMode>,
          );
        });

        expect(log).toEqual([
          'A: render',
          'A: render',
          'A: useLayoutEffect mount',
          'A: useEffect mount',
          'A: useLayoutEffect unmount',
          'A: useEffect unmount',
          'A: useLayoutEffect mount',
          'A: useEffect mount',
        ]);
      });

      // @gate experimental
      it('should allow level to be increased with nesting', () => {
        act(() => {
          const container = document.createElement('div');
          const root = ReactDOM.createRoot(container);
          root.render(
            <>
              <Component label="A" />
              <React.StrictMode>
                <Component label="B" />,
              </React.StrictMode>
              ,
            </>,
          );
        });

        expect(log).toEqual([
          'A: render',
          'B: render',
          'B: render',
          'A: useLayoutEffect mount',
          'B: useLayoutEffect mount',
          'A: useEffect mount',
          'B: useEffect mount',
          'B: useLayoutEffect unmount',
          'B: useEffect unmount',
          'B: useLayoutEffect mount',
          'B: useEffect mount',
        ]);
      });
    }
  });
});
