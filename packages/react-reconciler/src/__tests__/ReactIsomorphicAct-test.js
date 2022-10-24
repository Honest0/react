/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

// sanity tests for act()

let React;
let ReactNoop;
let act;
let use;
let Suspense;
let DiscreteEventPriority;
let startTransition;

describe('isomorphic act()', () => {
  beforeEach(() => {
    React = require('react');

    ReactNoop = require('react-noop-renderer');
    DiscreteEventPriority = require('react-reconciler/constants')
      .DiscreteEventPriority;
    act = React.unstable_act;
    use = React.use;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
  });

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  // @gate __DEV__
  test('bypasses queueMicrotask', async () => {
    const root = ReactNoop.createRoot();

    // First test what happens without wrapping in act. This update would
    // normally be queued in a microtask.
    global.IS_REACT_ACT_ENVIRONMENT = false;
    ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
      root.render('A');
    });
    // Nothing has rendered yet
    expect(root).toMatchRenderedOutput(null);
    // Flush the microtasks by awaiting
    await null;
    expect(root).toMatchRenderedOutput('A');

    // Now do the same thing but wrap the update with `act`. No
    // `await` necessary.
    global.IS_REACT_ACT_ENVIRONMENT = true;
    act(() => {
      ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
        root.render('B');
      });
    });
    expect(root).toMatchRenderedOutput('B');
  });

  // @gate __DEV__
  test('return value – sync callback', async () => {
    expect(await act(() => 'hi')).toEqual('hi');
  });

  // @gate __DEV__
  test('return value – sync callback, nested', async () => {
    const returnValue = await act(() => {
      return act(() => 'hi');
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  test('return value – async callback', async () => {
    const returnValue = await act(async () => {
      return await Promise.resolve('hi');
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  test('return value – async callback, nested', async () => {
    const returnValue = await act(async () => {
      return await act(async () => {
        return await Promise.resolve('hi');
      });
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  test('in legacy mode, updates are batched', () => {
    const root = ReactNoop.createLegacyRoot();

    // Outside of `act`, legacy updates are flushed completely synchronously
    root.render('A');
    expect(root).toMatchRenderedOutput('A');

    // `act` will batch the updates and flush them at the end
    act(() => {
      root.render('B');
      // Hasn't flushed yet
      expect(root).toMatchRenderedOutput('A');

      // Confirm that a nested `batchedUpdates` call won't cause the updates
      // to flush early.
      ReactNoop.batchedUpdates(() => {
        root.render('C');
      });

      // Still hasn't flushed
      expect(root).toMatchRenderedOutput('A');
    });

    // Now everything renders in a single batch.
    expect(root).toMatchRenderedOutput('C');
  });

  // @gate __DEV__
  test('in legacy mode, in an async scope, updates are batched until the first `await`', async () => {
    const root = ReactNoop.createLegacyRoot();

    await act(async () => {
      // These updates are batched. This replicates the behavior of the original
      // `act` implementation, for compatibility.
      root.render('A');
      root.render('B');
      // Nothing has rendered yet.
      expect(root).toMatchRenderedOutput(null);
      await null;
      // Updates are flushed after the first await.
      expect(root).toMatchRenderedOutput('B');

      // Subsequent updates in the same scope aren't batched.
      root.render('C');
      expect(root).toMatchRenderedOutput('C');
    });
  });

  // @gate __DEV__
  // @gate enableUseHook
  test('unwraps promises by yielding to microtasks (async act scope)', async () => {
    const promise = Promise.resolve('Async');

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate __DEV__
  // @gate enableUseHook
  test('unwraps promises by yielding to microtasks (non-async act scope)', async () => {
    const promise = Promise.resolve('Async');

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    const root = ReactNoop.createRoot();

    // Note that the scope function is not an async function
    await act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate __DEV__
  // @gate enableUseHook
  test('warns if a promise is used in a non-awaited `act` scope', async () => {
    const promise = new Promise(() => {});

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    spyOnDev(console, 'error');
    const root = ReactNoop.createRoot();
    act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });

    // `act` warns after a few microtasks, instead of a macrotask, so that it's
    // more likely to be attributed to the correct test case.
    //
    // The exact number of microtasks is an implementation detail; just needs
    // to happen when the microtask queue is flushed.
    await null;
    await null;
    await null;

    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'Warning: A component suspended inside an `act` scope, but the `act` ' +
        'call was not awaited. When testing React components that ' +
        'depend on asynchronous data, you must await the result:\n\n' +
        'await act(() => ...)',
    );
  });

  // @gate __DEV__
  test('does not warn when suspending via legacy `throw` API  in non-awaited `act` scope', async () => {
    let didResolve = false;
    let resolvePromise;
    const promise = new Promise(r => {
      resolvePromise = () => {
        didResolve = true;
        r();
      };
    });

    function Fallback() {
      return 'Loading...';
    }

    function App() {
      if (!didResolve) {
        throw promise;
      }
      return 'Async';
    }

    spyOnDev(console, 'error');
    const root = ReactNoop.createRoot();
    act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Loading...');

    // `act` warns after a few microtasks, instead of a macrotask, so that it's
    // more likely to be attributed to the correct test case.
    //
    // The exact number of microtasks is an implementation detail; just needs
    // to happen when the microtask queue is flushed.
    await null;
    await null;
    await null;

    expect(console.error.calls.count()).toBe(0);

    // Finish loading the data
    await act(async () => {
      resolvePromise();
    });
    expect(root).toMatchRenderedOutput('Async');
  });
});
