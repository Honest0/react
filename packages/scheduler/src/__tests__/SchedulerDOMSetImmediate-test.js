/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-for-of-loops/no-for-of-loops */

'use strict';

let Scheduler;
let runtime;
let performance;
let cancelCallback;
let scheduleCallback;
let NormalPriority;

// The Scheduler implementation uses browser APIs like `MessageChannel` and
// `setTimeout` to schedule work on the main thread. Most of our tests treat
// these as implementation details; however, the sequence and timing of these
// APIs are not precisely specified, and can vary across browsers.
//
// To prevent regressions, we need the ability to simulate specific edge cases
// that we may encounter in various browsers.
//
// This test suite mocks all browser methods used in our implementation. It
// assumes as little as possible about the order and timing of events.
describe('SchedulerDOMSetImmediate', () => {
  beforeEach(() => {
    jest.resetModules();

    // Un-mock scheduler
    jest.mock('scheduler', () => require.requireActual('scheduler'));

    runtime = installMockBrowserRuntime();
    performance = global.performance;
    Scheduler = require('scheduler');
    cancelCallback = Scheduler.unstable_cancelCallback;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    NormalPriority = Scheduler.unstable_NormalPriority;
  });

  afterEach(() => {
    delete global.performance;

    if (!runtime.isLogEmpty()) {
      throw Error('Test exited without clearing log.');
    }
  });

  function installMockBrowserRuntime() {
    let timerIDCounter = 0;
    // let timerIDs = new Map();

    let eventLog = [];

    let currentTime = 0;

    global.performance = {
      now() {
        return currentTime;
      },
    };

    const window = {};
    global.window = window;

    // TODO: Scheduler no longer requires these methods to be polyfilled. But
    // maybe we want to continue warning if they don't exist, to preserve the
    // option to rely on it in the future?
    window.requestAnimationFrame = window.cancelAnimationFrame = () => {};

    window.setTimeout = (cb, delay) => {
      const id = timerIDCounter++;
      log(`Set Timer`);
      // TODO
      return id;
    };
    window.clearTimeout = id => {
      // TODO
    };

    // Unused: we expect setImmediate to be preferred.
    global.MessageChannel = function() {
      return {
        port1: {},
        port2: {
          postMessage() {
            throw Error('Should be unused');
          },
        },
      };
    };

    let pendingSetImmediateCallback = null;
    window.setImmediate = function(cb) {
      if (pendingSetImmediateCallback) {
        throw Error('Message event already scheduled');
      }
      log('Set Immediate');
      pendingSetImmediateCallback = cb;
    };

    function ensureLogIsEmpty() {
      if (eventLog.length !== 0) {
        throw Error('Log is not empty. Call assertLog before continuing.');
      }
    }
    function advanceTime(ms) {
      currentTime += ms;
    }
    function fireSetImmediate() {
      ensureLogIsEmpty();
      if (!pendingSetImmediateCallback) {
        throw Error('No setImmediate was scheduled');
      }
      const cb = pendingSetImmediateCallback;
      pendingSetImmediateCallback = null;
      log('setImmediate Callback');
      cb();
    }
    function log(val) {
      eventLog.push(val);
    }
    function isLogEmpty() {
      return eventLog.length === 0;
    }
    function assertLog(expected) {
      const actual = eventLog;
      eventLog = [];
      expect(actual).toEqual(expected);
    }
    return {
      advanceTime,
      fireSetImmediate,
      log,
      isLogEmpty,
      assertLog,
    };
  }

  // @gate enableSchedulerSetImmediate
  it('task that finishes before deadline', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('Task');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Task']);
  });

  // @gate enableSchedulerSetImmediate
  it('task with continuation', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('Task');
      while (!Scheduler.unstable_shouldYield()) {
        runtime.advanceTime(1);
      }
      runtime.log(`Yield at ${performance.now()}ms`);
      return () => {
        runtime.log('Continuation');
      };
    });
    runtime.assertLog(['Set Immediate']);

    runtime.fireSetImmediate();
    runtime.assertLog([
      'setImmediate Callback',
      'Task',
      'Yield at 5ms',
      'Set Immediate',
    ]);

    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Continuation']);
  });

  // @gate enableSchedulerSetImmediate
  it('multiple tasks', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'A', 'B']);
  });

  // @gate enableSchedulerSetImmediate
  it('multiple tasks with a yield in between', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
      runtime.advanceTime(4999);
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog([
      'setImmediate Callback',
      'A',
      // Ran out of time. Post a continuation event.
      'Set Immediate',
    ]);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });

  // @gate enableSchedulerSetImmediate
  it('cancels tasks', () => {
    const task = scheduleCallback(NormalPriority, () => {
      runtime.log('Task');
    });
    runtime.assertLog(['Set Immediate']);
    cancelCallback(task);
    runtime.assertLog([]);
  });

  // @gate enableSchedulerSetImmediate
  it('throws when a task errors then continues in a new event', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('Oops!');
      throw Error('Oops!');
    });
    scheduleCallback(NormalPriority, () => {
      runtime.log('Yay');
    });
    runtime.assertLog(['Set Immediate']);

    expect(() => runtime.fireSetImmediate()).toThrow('Oops!');
    runtime.assertLog(['setImmediate Callback', 'Oops!', 'Set Immediate']);

    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Yay']);
  });

  // @gate enableSchedulerSetImmediate
  it('schedule new task after queue has emptied', () => {
    scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });

    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'A']);

    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });

  // @gate enableSchedulerSetImmediate
  it('schedule new task after a cancellation', () => {
    const handle = scheduleCallback(NormalPriority, () => {
      runtime.log('A');
    });

    runtime.assertLog(['Set Immediate']);
    cancelCallback(handle);

    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback']);

    scheduleCallback(NormalPriority, () => {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });
});
