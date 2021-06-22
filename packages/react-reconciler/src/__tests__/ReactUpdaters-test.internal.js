/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactFeatureFlags;
let ReactDOM;
let Scheduler;
let mockDevToolsHook;
let allSchedulerTags;
let allSchedulerTypes;
let onCommitRootShouldYield;
let act;

describe('updaters', () => {
  beforeEach(() => {
    jest.resetModules();

    allSchedulerTags = [];
    allSchedulerTypes = [];

    onCommitRootShouldYield = true;

    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableUpdaterTracking = true;
    ReactFeatureFlags.debugRenderPhaseSideEffectsForStrictMode = false;

    mockDevToolsHook = {
      injectInternals: jest.fn(() => {}),
      isDevToolsPresent: true,
      onCommitRoot: jest.fn(fiberRoot => {
        if (onCommitRootShouldYield) {
          Scheduler.unstable_yieldValue('onCommitRoot');
        }
        const schedulerTags = [];
        const schedulerTypes = [];
        fiberRoot.memoizedUpdaters.forEach(fiber => {
          schedulerTags.push(fiber.tag);
          schedulerTypes.push(fiber.elementType);
        });
        allSchedulerTags.push(schedulerTags);
        allSchedulerTypes.push(schedulerTypes);
      }),
      onCommitUnmount: jest.fn(() => {}),
      onPostCommitRoot: jest.fn(() => {}),
      onScheduleRoot: jest.fn(() => {}),
    };

    jest.mock(
      'react-reconciler/src/ReactFiberDevToolsHook.old',
      () => mockDevToolsHook,
    );
    jest.mock(
      'react-reconciler/src/ReactFiberDevToolsHook.new',
      () => mockDevToolsHook,
    );

    React = require('react');
    ReactDOM = require('react-dom');
    Scheduler = require('scheduler');

    act = require('jest-react').act;
  });

  it('should report the (host) root as the scheduler for root-level render', async () => {
    const {HostRoot} = require('react-reconciler/src/ReactWorkTags');

    const Parent = () => <Child />;
    const Child = () => null;
    const container = document.createElement('div');

    await act(async () => {
      ReactDOM.render(<Parent />, container);
    });
    expect(allSchedulerTags).toEqual([[HostRoot]]);

    await act(async () => {
      ReactDOM.render(<Parent />, container);
    });
    expect(allSchedulerTags).toEqual([[HostRoot], [HostRoot]]);
  });

  it('should report a function component as the scheduler for a hooks update', async () => {
    let scheduleForA = null;
    let scheduleForB = null;

    const Parent = () => (
      <React.Fragment>
        <SchedulingComponentA />
        <SchedulingComponentB />
      </React.Fragment>
    );
    const SchedulingComponentA = () => {
      const [count, setCount] = React.useState(0);
      scheduleForA = () => setCount(prevCount => prevCount + 1);
      return <Child count={count} />;
    };
    const SchedulingComponentB = () => {
      const [count, setCount] = React.useState(0);
      scheduleForB = () => setCount(prevCount => prevCount + 1);
      return <Child count={count} />;
    };
    const Child = () => null;

    await act(async () => {
      ReactDOM.render(<Parent />, document.createElement('div'));
    });
    expect(scheduleForA).not.toBeNull();
    expect(scheduleForB).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);

    await act(async () => {
      scheduleForA();
    });
    expect(allSchedulerTypes).toEqual([[null], [SchedulingComponentA]]);

    await act(async () => {
      scheduleForB();
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponentA],
      [SchedulingComponentB],
    ]);
  });

  it('should report a class component as the scheduler for a setState update', async () => {
    const Parent = () => <SchedulingComponent />;
    class SchedulingComponent extends React.Component {
      state = {};
      render() {
        instance = this;
        return <Child />;
      }
    }
    const Child = () => null;
    let instance;
    await act(async () => {
      ReactDOM.render(<Parent />, document.createElement('div'));
    });
    expect(allSchedulerTypes).toEqual([[null]]);

    expect(instance).not.toBeNull();
    await act(async () => {
      instance.setState({});
    });
    expect(allSchedulerTypes).toEqual([[null], [SchedulingComponent]]);
  });

  it('should cover cascading updates', async () => {
    let triggerActiveCascade = null;
    let triggerPassiveCascade = null;

    const Parent = () => <SchedulingComponent />;
    const SchedulingComponent = () => {
      const [cascade, setCascade] = React.useState(null);
      triggerActiveCascade = () => setCascade('active');
      triggerPassiveCascade = () => setCascade('passive');
      return <CascadingChild cascade={cascade} />;
    };
    const CascadingChild = ({cascade}) => {
      const [count, setCount] = React.useState(0);
      Scheduler.unstable_yieldValue(`CascadingChild ${count}`);
      React.useLayoutEffect(() => {
        if (cascade === 'active') {
          setCount(prevCount => prevCount + 1);
        }
        return () => {};
      }, [cascade]);
      React.useEffect(() => {
        if (cascade === 'passive') {
          setCount(prevCount => prevCount + 1);
        }
        return () => {};
      }, [cascade]);
      return count;
    };

    const root = ReactDOM.createRoot(document.createElement('div'));
    await act(async () => {
      root.render(<Parent />);
      expect(Scheduler).toFlushAndYieldThrough([
        'CascadingChild 0',
        'onCommitRoot',
      ]);
    });
    expect(triggerActiveCascade).not.toBeNull();
    expect(triggerPassiveCascade).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);

    await act(async () => {
      triggerActiveCascade();
      expect(Scheduler).toFlushAndYieldThrough([
        'CascadingChild 0',
        'onCommitRoot',
        'CascadingChild 1',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponent],
      [CascadingChild],
    ]);

    await act(async () => {
      triggerPassiveCascade();
      expect(Scheduler).toFlushAndYieldThrough([
        'CascadingChild 1',
        'onCommitRoot',
        'CascadingChild 2',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponent],
      [CascadingChild],
      [SchedulingComponent],
      [CascadingChild],
    ]);

    // Verify no outstanding flushes
    Scheduler.unstable_flushAll();
  });

  it('should cover suspense pings', async done => {
    let data = null;
    let resolver = null;
    let promise = null;
    const fakeCacheRead = () => {
      if (data === null) {
        promise = new Promise(resolve => {
          resolver = resolvedData => {
            data = resolvedData;
            resolve(resolvedData);
          };
        });
        throw promise;
      } else {
        return data;
      }
    };
    const Parent = () => (
      <React.Suspense fallback={<Fallback />}>
        <Suspender />
      </React.Suspense>
    );
    const Fallback = () => null;
    let setShouldSuspend = null;
    const Suspender = ({suspend}) => {
      const tuple = React.useState(false);
      setShouldSuspend = tuple[1];
      if (tuple[0] === true) {
        return fakeCacheRead();
      } else {
        return null;
      }
    };

    await act(async () => {
      ReactDOM.render(<Parent />, document.createElement('div'));
      expect(Scheduler).toHaveYielded(['onCommitRoot']);
    });
    expect(setShouldSuspend).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);

    await act(async () => {
      setShouldSuspend(true);
    });
    expect(Scheduler).toHaveYielded(['onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[null], [Suspender]]);

    expect(resolver).not.toBeNull();
    await act(() => {
      resolver('abc');
      return promise;
    });
    expect(Scheduler).toHaveYielded(['onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[null], [Suspender], [Suspender]]);

    // Verify no outstanding flushes
    Scheduler.unstable_flushAll();

    done();
  });

  it('should cover error handling', async () => {
    let triggerError = null;

    const Parent = () => {
      const [shouldError, setShouldError] = React.useState(false);
      triggerError = () => setShouldError(true);
      return shouldError ? (
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Yield value="initial" />
        </ErrorBoundary>
      );
    };
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <Yield value="error" />;
        }
        return this.props.children;
      }
    }
    const Yield = ({value}) => {
      Scheduler.unstable_yieldValue(value);
      return null;
    };
    const BrokenRender = () => {
      throw new Error('Hello');
    };

    const root = ReactDOM.createRoot(document.createElement('div'));
    await act(async () => {
      root.render(<Parent shouldError={false} />);
    });
    expect(Scheduler).toHaveYielded(['initial', 'onCommitRoot']);
    expect(triggerError).not.toBeNull();

    allSchedulerTypes.splice(0);
    onCommitRootShouldYield = true;

    await act(async () => {
      triggerError();
    });
    expect(Scheduler).toHaveYielded(['onCommitRoot', 'error', 'onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[Parent], [ErrorBoundary]]);

    // Verify no outstanding flushes
    Scheduler.unstable_flushAll();
  });

  it('should distinguish between updaters in the case of interleaved work', async () => {
    const {
      FunctionComponent,
      HostRoot,
    } = require('react-reconciler/src/ReactWorkTags');

    let triggerLowPriorityUpdate = null;
    let triggerSyncPriorityUpdate = null;

    const SyncPriorityUpdater = () => {
      const [count, setCount] = React.useState(0);
      triggerSyncPriorityUpdate = () => setCount(prevCount => prevCount + 1);
      Scheduler.unstable_yieldValue(`SyncPriorityUpdater ${count}`);
      return <Yield value={`HighPriority ${count}`} />;
    };
    const LowPriorityUpdater = () => {
      const [count, setCount] = React.useState(0);
      triggerLowPriorityUpdate = () => {
        React.startTransition(() => {
          setCount(prevCount => prevCount + 1);
        });
      };
      Scheduler.unstable_yieldValue(`LowPriorityUpdater ${count}`);
      return <Yield value={`LowPriority ${count}`} />;
    };
    const Yield = ({value}) => {
      Scheduler.unstable_yieldValue(`Yield ${value}`);
      return null;
    };

    const root = ReactDOM.createRoot(document.createElement('div'));
    root.render(
      <React.Fragment>
        <SyncPriorityUpdater />
        <LowPriorityUpdater />
      </React.Fragment>,
    );

    // Render everything initially.
    expect(Scheduler).toFlushAndYield([
      'SyncPriorityUpdater 0',
      'Yield HighPriority 0',
      'LowPriorityUpdater 0',
      'Yield LowPriority 0',
      'onCommitRoot',
    ]);
    expect(triggerLowPriorityUpdate).not.toBeNull();
    expect(triggerSyncPriorityUpdate).not.toBeNull();
    expect(allSchedulerTags).toEqual([[HostRoot]]);

    // Render a partial update, but don't finish.
    act(() => {
      triggerLowPriorityUpdate();
      expect(Scheduler).toFlushAndYieldThrough(['LowPriorityUpdater 1']);
      expect(allSchedulerTags).toEqual([[HostRoot]]);

      // Interrupt with higher priority work.
      ReactDOM.flushSync(triggerSyncPriorityUpdate);
      expect(Scheduler).toHaveYielded([
        'SyncPriorityUpdater 1',
        'Yield HighPriority 1',
        'onCommitRoot',
      ]);
      expect(allSchedulerTypes).toEqual([[null], [SyncPriorityUpdater]]);

      // Finish the initial partial update
      triggerLowPriorityUpdate();
      expect(Scheduler).toFlushAndYield([
        'LowPriorityUpdater 2',
        'Yield LowPriority 2',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTags).toEqual([
      [HostRoot],
      [FunctionComponent],
      [FunctionComponent],
    ]);
    expect(allSchedulerTypes).toEqual([
      [null],
      [SyncPriorityUpdater],
      [LowPriorityUpdater],
    ]);

    // Verify no outstanding flushes
    Scheduler.unstable_flushAll();
  });
});
