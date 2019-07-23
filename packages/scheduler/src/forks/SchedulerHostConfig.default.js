/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  enableIsInputPending,
  requestIdleCallbackBeforeFirstFrame as requestIdleCallbackBeforeFirstFrameFlag,
  requestTimerEventBeforeFirstFrame,
} from '../SchedulerFeatureFlags';

// The DOM Scheduler implementation is similar to requestIdleCallback. It
// works by scheduling a requestAnimationFrame, storing the time for the start
// of the frame, then scheduling a postMessage which gets scheduled after paint.
// Within the postMessage handler do as much work as possible until time + frame
// rate. By separating the idle call into a separate event tick we ensure that
// layout, paint and other browser work is counted against the available time.
// The frame rate is dynamically adjusted.

export let requestHostCallback;
export let cancelHostCallback;
export let requestHostTimeout;
export let cancelHostTimeout;
export let shouldYieldToHost;
export let requestPaint;
export let getCurrentTime;
export let forceFrameRate;

if (
  // If Scheduler runs in a non-DOM environment, it falls back to a naive
  // implementation using setTimeout.
  typeof window === 'undefined' ||
  // Check if MessageChannel is supported, too.
  typeof MessageChannel !== 'function'
) {
  // If this accidentally gets imported in a non-browser environment, e.g. JavaScriptCore,
  // fallback to a naive implementation.
  let _callback = null;
  let _timeoutID = null;
  const _flushCallback = function() {
    if (_callback !== null) {
      try {
        const currentTime = getCurrentTime();
        const hasRemainingTime = true;
        _callback(hasRemainingTime, currentTime);
        _callback = null;
      } catch (e) {
        setTimeout(_flushCallback, 0);
        throw e;
      }
    }
  };
  getCurrentTime = function() {
    return Date.now();
  };
  requestHostCallback = function(cb) {
    if (_callback !== null) {
      // Protect against re-entrancy.
      setTimeout(requestHostCallback, 0, cb);
    } else {
      _callback = cb;
      setTimeout(_flushCallback, 0);
    }
  };
  cancelHostCallback = function() {
    _callback = null;
  };
  requestHostTimeout = function(cb, ms) {
    _timeoutID = setTimeout(cb, ms);
  };
  cancelHostTimeout = function() {
    clearTimeout(_timeoutID);
  };
  shouldYieldToHost = function() {
    return false;
  };
  requestPaint = forceFrameRate = function() {};
} else {
  // Capture local references to native APIs, in case a polyfill overrides them.
  const performance = window.performance;
  const Date = window.Date;
  const setTimeout = window.setTimeout;
  const clearTimeout = window.clearTimeout;
  const requestAnimationFrame = window.requestAnimationFrame;
  const cancelAnimationFrame = window.cancelAnimationFrame;
  const requestIdleCallback = window.requestIdleCallback;

  if (typeof console !== 'undefined') {
    // TODO: Remove fb.me link
    if (typeof requestAnimationFrame !== 'function') {
      console.error(
        "This browser doesn't support requestAnimationFrame. " +
          'Make sure that you load a ' +
          'polyfill in older browsers. https://fb.me/react-polyfills',
      );
    }
    if (typeof cancelAnimationFrame !== 'function') {
      console.error(
        "This browser doesn't support cancelAnimationFrame. " +
          'Make sure that you load a ' +
          'polyfill in older browsers. https://fb.me/react-polyfills',
      );
    }
  }

  const requestIdleCallbackBeforeFirstFrame =
    requestIdleCallbackBeforeFirstFrameFlag &&
    typeof requestIdleCallback === 'function' &&
    typeof cancelIdleCallback === 'function';

  getCurrentTime =
    typeof performance === 'object' && typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();

  let isRAFLoopRunning = false;
  let scheduledHostCallback = null;
  let rAFTimeoutID = -1;
  let taskTimeoutID = -1;

  // We start out assuming that we run at 30fps but then the heuristic tracking
  // will adjust this value to a faster fps if we get more frequent animation
  // frames.
  let frameLength = 33.33;
  let prevRAFTime = -1;
  let prevRAFInterval = -1;
  let frameDeadline = 0;

  let fpsLocked = false;

  // TODO: Make this configurable
  // TODO: Adjust this based on priority?
  let maxFrameLength = 300;
  let needsPaint = false;

  if (
    enableIsInputPending &&
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    const scheduling = navigator.scheduling;
    shouldYieldToHost = function() {
      const currentTime = getCurrentTime();
      if (currentTime >= frameDeadline) {
        // There's no time left in the frame. We may want to yield control of
        // the main thread, so the browser can perform high priority tasks. The
        // main ones are painting and user input. If there's a pending paint or
        // a pending input, then we should yield. But if there's neither, then
        // we can yield less often while remaining responsive. We'll eventually
        // yield regardless, since there could be a pending paint that wasn't
        // accompanied by a call to `requestPaint`, or other main thread tasks
        // like network events.
        if (needsPaint || scheduling.isInputPending()) {
          // There is either a pending paint or a pending input.
          return true;
        }
        // There's no pending input. Only yield if we've reached the max
        // frame length.
        return currentTime >= frameDeadline + maxFrameLength;
      } else {
        // There's still time left in the frame.
        return false;
      }
    };

    requestPaint = function() {
      needsPaint = true;
    };
  } else {
    // `isInputPending` is not available. Since we have no way of knowing if
    // there's pending input, always yield at the end of the frame.
    shouldYieldToHost = function() {
      return getCurrentTime() >= frameDeadline;
    };

    // Since we yield every frame regardless, `requestPaint` has no effect.
    requestPaint = function() {};
  }

  forceFrameRate = function(fps) {
    if (fps < 0 || fps > 125) {
      console.error(
        'forceFrameRate takes a positive int between 0 and 125, ' +
          'forcing framerates higher than 125 fps is not unsupported',
      );
      return;
    }
    if (fps > 0) {
      frameLength = Math.floor(1000 / fps);
      fpsLocked = true;
    } else {
      // reset the framerate
      frameLength = 33.33;
      fpsLocked = false;
    }
  };

  const performWorkUntilDeadline = () => {
    if (scheduledHostCallback !== null) {
      const currentTime = getCurrentTime();
      const hasTimeRemaining = frameDeadline - currentTime > 0;
      try {
        const hasMoreWork = scheduledHostCallback(
          hasTimeRemaining,
          currentTime,
        );
        if (!hasMoreWork) {
          scheduledHostCallback = null;
        }
      } catch (error) {
        // If a scheduler task throws, exit the current browser task so the
        // error can be observed, and post a new task as soon as possible
        // so we can continue where we left off.
        port.postMessage(null);
        throw error;
      }
    }
    // Yielding to the browser will give it a chance to paint, so we can
    // reset this.
    needsPaint = false;
  };

  // We use the postMessage trick to defer idle work until after the repaint.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;

  const onAnimationFrame = rAFTime => {
    isRAFLoopRunning = false;

    if (scheduledHostCallback === null) {
      // No scheduled work. Exit.
      prevRAFTime = -1;
      prevRAFInterval = -1;
      return;
    }
    if (rAFTime - prevRAFTime < 0.1) {
      // Defensive coding. Received two rAFs in the same frame. Exit and wait
      // for the next frame.
      // TODO: This could be an indication that the frame rate is too high. We
      // don't currently handle the case where the browser dynamically lowers
      // the framerate, e.g. in low power situation (other than the rAF timeout,
      // but that's designed for when the tab is backgrounded and doesn't
      // optimize for maxiumum CPU utilization).
      return;
    }

    // Eagerly schedule the next animation callback at the beginning of the
    // frame. If the scheduler queue is not empty at the end of the frame, it
    // will continue flushing inside that callback. If the queue *is* empty,
    // then it will exit immediately. Posting the callback at the start of the
    // frame ensures it's fired within the earliest possible frame. If we
    // waited until the end of the frame to post the callback, we risk the
    // browser skipping a frame and not firing the callback until the frame
    // after that.
    isRAFLoopRunning = true;
    requestAnimationFrame(nextRAFTime => {
      clearTimeout(rAFTimeoutID);
      onAnimationFrame(nextRAFTime);
    });
    // requestAnimationFrame is throttled when the tab is backgrounded. We
    // don't want to stop working entirely. So we'll fallback to a timeout loop.
    // TODO: Need a better heuristic for backgrounded work.
    const onTimeout = () => {
      frameDeadline = getCurrentTime() + frameLength / 2;
      performWorkUntilDeadline();
      rAFTimeoutID = setTimeout(onTimeout, frameLength * 3);
    };
    rAFTimeoutID = setTimeout(onTimeout, frameLength * 3);

    if (prevRAFTime !== -1) {
      const rAFInterval = rAFTime - prevRAFTime;
      if (!fpsLocked && prevRAFInterval !== -1) {
        // We've observed two consecutive frame intervals. We'll use this to
        // dynamically adjust the frame rate.
        //
        // If one frame goes long, then the next one can be short to catch up.
        // If two frames are short in a row, then that's an indication that we
        // actually have a higher frame rate than what we're currently
        // optimizing. For example, if we're running on 120hz display or 90hz VR
        // display. Take the max of the two in case one of them was an anomaly
        // due to missed frame deadlines.
        if (rAFInterval < frameLength && prevRAFInterval < frameLength) {
          frameLength =
            rAFInterval < prevRAFInterval ? prevRAFInterval : rAFInterval;
          if (frameLength < 8.33) {
            // Defensive coding. We don't support higher frame rates than 120hz.
            // If the calculated frame length gets lower than 8, it is probably
            // a bug.
            frameLength = 8.33;
          }
        }
      }
      prevRAFInterval = rAFInterval;
    }
    prevRAFTime = rAFTime;
    frameDeadline = rAFTime + frameLength;

    port.postMessage(null);
  };

  requestHostCallback = function(callback) {
    scheduledHostCallback = callback;
    if (!isRAFLoopRunning) {
      // Start a rAF loop.
      isRAFLoopRunning = true;
      requestAnimationFrame(rAFTime => {
        if (requestIdleCallbackBeforeFirstFrame) {
          cancelIdleCallback(idleCallbackID);
        }
        if (requestTimerEventBeforeFirstFrame) {
          clearTimeout(idleTimeoutID);
        }
        onAnimationFrame(rAFTime);
      });

      // If we just missed the last vsync, the next rAF might not happen for
      // another frame. To claim as much idle time as possible, post a callback
      // with `requestIdleCallback`, which should fire if there's idle time left
      // in the frame.
      //
      // This should only be an issue for the first rAF in the loop; subsequent
      // rAFs are scheduled at the beginning of the preceding frame.
      let idleCallbackID;
      if (requestIdleCallbackBeforeFirstFrame) {
        idleCallbackID = requestIdleCallback(() => {
          if (requestTimerEventBeforeFirstFrame) {
            clearTimeout(idleTimeoutID);
          }
          frameDeadline = getCurrentTime() + frameLength;
          performWorkUntilDeadline();
        });
      }
      // Alternate strategy to address the same problem. Scheduler a timer with
      // no delay. If this fires before the rAF, that likely indicates that
      // there's idle time before the next vsync. This isn't always the case,
      // but we'll be aggressive and assume it is, as a trade off to prevent
      // idle periods.
      let idleTimeoutID;
      if (requestTimerEventBeforeFirstFrame) {
        idleTimeoutID = setTimeout(() => {
          if (requestIdleCallbackBeforeFirstFrame) {
            cancelIdleCallback(idleCallbackID);
          }
          frameDeadline = getCurrentTime() + frameLength;
          performWorkUntilDeadline();
        }, 0);
      }
    }
  };

  cancelHostCallback = function() {
    scheduledHostCallback = null;
  };

  requestHostTimeout = function(callback, ms) {
    taskTimeoutID = setTimeout(() => {
      callback(getCurrentTime());
    }, ms);
  };

  cancelHostTimeout = function() {
    clearTimeout(taskTimeoutID);
    taskTimeoutID = -1;
  };
}
