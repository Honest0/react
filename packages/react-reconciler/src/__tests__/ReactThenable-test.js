'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let use;
let Suspense;
let startTransition;
let pendingTextRequests;

describe('ReactThenable', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('jest-react').act;
    use = React.use;
    Suspense = React.Suspense;
    startTransition = React.startTransition;

    pendingTextRequests = new Map();
  });

  function resolveTextRequests(text) {
    const requests = pendingTextRequests.get(text);
    if (requests !== undefined) {
      pendingTextRequests.delete(text);
      requests.forEach(resolve => resolve(text));
    }
  }

  function getAsyncText(text) {
    // getAsyncText is completely uncached — it performs a new async operation
    // every time it's called. During a transition, React should be able to
    // unwrap it anyway.
    Scheduler.unstable_yieldValue(`Async text requested [${text}]`);
    return new Promise(resolve => {
      const requests = pendingTextRequests.get(text);
      if (requests !== undefined) {
        requests.push(resolve);
        pendingTextRequests.set(text, requests);
      } else {
        pendingTextRequests.set(text, [resolve]);
      }
    });
  }

  function Text({text}) {
    Scheduler.unstable_yieldValue(text);
    return text;
  }

  // This behavior was intentionally disabled to derisk the rollout of `use`.
  // It changes the behavior of old, pre-`use` Suspense implementations. We may
  // add this back; however, the plan is to migrate all existing Suspense code
  // to `use`, so the extra code probably isn't worth it.
  // @gate TODO
  test('if suspended fiber is pinged in a microtask, retry immediately without unwinding the stack', async () => {
    let fulfilled = false;
    function Async() {
      if (fulfilled) {
        return <Text text="Async" />;
      }
      Scheduler.unstable_yieldValue('Suspend!');
      throw Promise.resolve().then(() => {
        Scheduler.unstable_yieldValue('Resolve in microtask');
        fulfilled = true;
      });
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Async />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });

    expect(Scheduler).toHaveYielded([
      // React will yield when the async component suspends.
      'Suspend!',
      'Resolve in microtask',

      // Finished rendering without unwinding the stack or preparing a fallback.
      'Async',
    ]);
    expect(root).toMatchRenderedOutput('Async');
  });

  test('if suspended fiber is pinged in a microtask, it does not block a transition from completing', async () => {
    let fulfilled = false;
    function Async() {
      if (fulfilled) {
        return <Text text="Async" />;
      }
      Scheduler.unstable_yieldValue('Suspend!');
      throw Promise.resolve().then(() => {
        Scheduler.unstable_yieldValue('Resolve in microtask');
        fulfilled = true;
      });
    }

    function App() {
      return <Async />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded([
      'Suspend!',
      'Resolve in microtask',
      'Async',
    ]);
    expect(root).toMatchRenderedOutput('Async');
  });

  test('does not infinite loop if already fulfilled thenable is thrown', async () => {
    // An already fulfilled promise should never be thrown. Since it already
    // fulfilled, we shouldn't bother trying to render again — doing so would
    // likely lead to an infinite loop. This scenario should only happen if a
    // userspace Suspense library makes an implementation mistake.

    // Create an already fulfilled thenable
    const thenable = {
      then(ping) {},
      status: 'fulfilled',
      value: null,
    };

    let i = 0;
    function Async() {
      if (i++ > 50) {
        throw new Error('Infinite loop detected');
      }
      Scheduler.unstable_yieldValue('Suspend!');
      // This thenable should never be thrown because it already fulfilled.
      // But if it is thrown, React should handle it gracefully.
      throw thenable;
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Async />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App />);
    });
    expect(Scheduler).toHaveYielded(['Suspend!', 'Loading...']);
    expect(root).toMatchRenderedOutput('Loading...');
  });

  // @gate enableUseHook
  test('basic use(promise)', async () => {
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.resolve('B');
    const promiseC = Promise.resolve('C');

    function Async() {
      const text = use(promiseA) + use(promiseB) + use(promiseC);
      return <Text text={text} />;
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Async />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded(['ABC']);
    expect(root).toMatchRenderedOutput('ABC');
  });

  // @gate enableUseHook
  test("using a promise that's not cached between attempts", async () => {
    function Async() {
      const text =
        use(Promise.resolve('A')) +
        use(Promise.resolve('B')) +
        use(Promise.resolve('C'));
      return <Text text={text} />;
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Async />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded(['ABC']);
    expect(root).toMatchRenderedOutput('ABC');
  });

  // @gate enableUseHook
  test('using a rejected promise will throw', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const promiseA = Promise.resolve('A');
    const promiseB = Promise.reject(new Error('Oops!'));
    const promiseC = Promise.resolve('C');

    // Jest/Node will raise an unhandled rejected error unless we await this. It
    // works fine in the browser, though.
    await expect(promiseB).rejects.toThrow('Oops!');

    function Async() {
      const text = use(promiseA) + use(promiseB) + use(promiseC);
      return <Text text={text} />;
    }

    function App() {
      return (
        <ErrorBoundary>
          <Async />
        </ErrorBoundary>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded(['Oops!', 'Oops!']);
  });

  // @gate enableUseHook
  test('use(promise) in multiple components', async () => {
    // This tests that the state for tracking promises is reset per component.
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.resolve('B');
    const promiseC = Promise.resolve('C');
    const promiseD = Promise.resolve('D');

    function Child({prefix}) {
      return <Text text={prefix + use(promiseC) + use(promiseD)} />;
    }

    function Parent() {
      return <Child prefix={use(promiseA) + use(promiseB)} />;
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Parent />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded(['ABCD']);
    expect(root).toMatchRenderedOutput('ABCD');
  });

  // @gate enableUseHook
  test('use(promise) in multiple sibling components', async () => {
    // This tests that the state for tracking promises is reset per component.

    const promiseA = {then: () => {}, status: 'pending', value: null};
    const promiseB = {then: () => {}, status: 'pending', value: null};
    const promiseC = {then: () => {}, status: 'fulfilled', value: 'C'};
    const promiseD = {then: () => {}, status: 'fulfilled', value: 'D'};

    function Sibling1({prefix}) {
      return <Text text={use(promiseA) + use(promiseB)} />;
    }

    function Sibling2() {
      return <Text text={use(promiseC) + use(promiseD)} />;
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Sibling1 />
          <Sibling2 />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded(['CD', 'Loading...']);
    expect(root).toMatchRenderedOutput('Loading...');
  });

  // @gate enableUseHook
  test('erroring in the same component as an uncached promise does not result in an infinite loop', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <Text text={'Caught an error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let i = 0;
    function Async({
      // Intentionally destrucutring a prop here so that our production error
      // stack trick is triggered at the beginning of the function
      prop,
    }) {
      if (i++ > 50) {
        throw new Error('Infinite loop detected');
      }
      try {
        use(Promise.resolve('Async'));
      } catch (e) {
        Scheduler.unstable_yieldValue('Suspend! [Async]');
        throw e;
      }
      throw new Error('Oops!');
    }

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <ErrorBoundary>
            <Async />
          </ErrorBoundary>
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });
    expect(Scheduler).toHaveYielded([
      // First attempt. The uncached promise suspends.
      'Suspend! [Async]',
      // Because the promise already fulfilled, we're able to unwrap the value
      // immediately in a microtask.
      //
      // Then we proceed to the rest of the component, which throws an error.
      'Caught an error: Oops!',

      // During the sync error recovery pass, the component suspends, because
      // we were unable to unwrap the value of the promise.
      'Suspend! [Async]',
      'Loading...',

      // Because the error recovery attempt suspended, React can't tell if the
      // error was actually fixed, or it was masked by the suspended data.
      // In this case, it wasn't actually fixed, so if we were to commit the
      // suspended fallback, it would enter an endless error recovery loop.
      //
      // Instead, we disable error recovery for these lanes and start
      // over again.

      // This time, the error is thrown and we commit the result.
      'Suspend! [Async]',
      'Caught an error: Oops!',
    ]);
    expect(root).toMatchRenderedOutput('Caught an error: Oops!');
  });

  // @gate enableUseHook
  test('basic use(context)', () => {
    const ContextA = React.createContext('');
    const ContextB = React.createContext('B');

    function Sync() {
      const text = use(ContextA) + use(ContextB);
      return text;
    }

    function App() {
      return (
        <ContextA.Provider value="A">
          <Sync />
        </ContextA.Provider>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(root).toMatchRenderedOutput('AB');
  });

  // @gate enableUseHook
  test('interrupting while yielded should reset contexts', async () => {
    let resolve;
    const promise = new Promise(r => {
      resolve = r;
    });

    const Context = React.createContext();

    const lazy = React.lazy(() => {
      return promise;
    });

    function ContextText() {
      return <Text text={use(Context)} />;
    }

    function App({text}) {
      return (
        <div>
          <Context.Provider value={text}>
            {lazy}
            <ContextText />
          </Context.Provider>
        </div>
      );
    }

    const root = ReactNoop.createRoot();
    startTransition(() => {
      root.render(<App text="world" />);
    });
    expect(Scheduler).toFlushUntilNextPaint([]);
    expect(root).toMatchRenderedOutput(null);

    await resolve({default: <Text key="hi" text="Hello " />});

    // Higher priority update that interrupts the first render
    ReactNoop.flushSync(() => {
      root.render(<App text="world!" />);
    });

    expect(Scheduler).toHaveYielded(['Hello ', 'world!']);

    expect(root).toMatchRenderedOutput(<div>Hello world!</div>);
  });

  // @gate enableUseHook || !__DEV__
  test('warns if use(promise) is wrapped with try/catch block', async () => {
    function Async() {
      try {
        return <Text text={use(Promise.resolve('Async'))} />;
      } catch (e) {
        return <Text text="Fallback" />;
      }
    }

    spyOnDev(console, 'error');
    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Async />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(<App />);
      });
    });

    if (__DEV__) {
      expect(console.error.calls.count()).toBe(1);
      expect(console.error.calls.argsFor(0)[0]).toContain(
        'Warning: `use` was called from inside a try/catch block. This is not ' +
          'allowed and can lead to unexpected behavior. To handle errors ' +
          'triggered by `use`, wrap your component in a error boundary.',
      );
    }
  });

  // @gate enableUseHook
  test('during a transition, can unwrap async operations even if nothing is cached', async () => {
    function App() {
      return <Text text={use(getAsyncText('Async'))} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="(empty)" />
        </Suspense>,
      );
    });
    expect(Scheduler).toHaveYielded(['(empty)']);
    expect(root).toMatchRenderedOutput('(empty)');

    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(Scheduler).toHaveYielded(['Async text requested [Async]']);
    expect(root).toMatchRenderedOutput('(empty)');

    await act(async () => {
      resolveTextRequests('Async');
    });
    expect(Scheduler).toHaveYielded(['Async text requested [Async]', 'Async']);
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate enableUseHook
  test("does not prevent a Suspense fallback from showing if it's a new boundary, even during a transition", async () => {
    function App() {
      return <Text text={use(getAsyncText('Async'))} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <App />
          </Suspense>,
        );
      });
    });
    // Even though the initial render was a transition, it shows a fallback.
    expect(Scheduler).toHaveYielded([
      'Async text requested [Async]',
      'Loading...',
    ]);
    expect(root).toMatchRenderedOutput('Loading...');

    // Resolve the original data
    await act(async () => {
      resolveTextRequests('Async');
    });
    // During the retry, a fresh request is initiated. Now we must wait for this
    // one to finish.
    // TODO: This is awkward. Intuitively, you might expect for `act` to wait
    // until the new request has finished loading. But if it's mock IO, as in
    // this test, how would the developer be able to imperatively flush it if it
    // wasn't initiated until the current `act` call? Can't think of a better
    // strategy at the moment.
    expect(Scheduler).toHaveYielded(['Async text requested [Async]']);
    expect(root).toMatchRenderedOutput('Loading...');

    // Flush the second request.
    await act(async () => {
      resolveTextRequests('Async');
    });
    // This time it finishes because it was during a retry.
    expect(Scheduler).toHaveYielded(['Async text requested [Async]', 'Async']);
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate enableUseHook
  test('when waiting for data to resolve, a fresh update will trigger a restart', async () => {
    function App() {
      return <Text text={use(getAsyncText('Will never resolve'))} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<Suspense fallback={<Text text="Loading..." />} />);
    });

    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(Scheduler).toHaveYielded([
      'Async text requested [Will never resolve]',
    ]);

    await act(async () => {
      root.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="Something different" />
        </Suspense>,
      );
    });
    expect(Scheduler).toHaveYielded(['Something different']);
  });

  // @gate enableUseHook
  test('unwraps thenable that fulfills synchronously without suspending', async () => {
    function App() {
      const thenable = {
        then(resolve) {
          // This thenable immediately resolves, synchronously, without waiting
          // a microtask.
          resolve('Hi');
        },
      };
      try {
        return <Text text={use(thenable)} />;
      } catch {
        throw new Error(
          '`use` should not suspend because the thenable resolved synchronously.',
        );
      }
    }
    // Because the thenable resolves synchronously, we should be able to finish
    // rendering synchronously, with no fallback.
    const root = ReactNoop.createRoot();
    ReactNoop.flushSync(() => {
      root.render(<App />);
    });
    expect(Scheduler).toHaveYielded(['Hi']);
    expect(root).toMatchRenderedOutput('Hi');
  });
});
