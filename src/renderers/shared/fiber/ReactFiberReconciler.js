/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberReconciler
 * @flow
 */

'use strict';

import type { Fiber } from 'ReactFiber';
var ReactFiber = require('ReactFiber');
var { beginWork } = require('ReactFiberBeginWork');
var { completeWork } = require('ReactFiberCompleteWork');

type ReactHostElement<T, P> = {
  type: T,
  props: P
};

type Deadline = {
  timeRemaining : () => number
};

var timeHeuristicForUnitOfWork = 1;

export type HostConfig<T, P, I> = {

  createHostInstance(element : ReactHostElement<T, P>) : I,
  scheduleHighPriCallback(callback : () => void) : void,
  scheduleLowPriCallback(callback : (deadline : Deadline) => void) : void

};

type OpaqueID = {};

export type Reconciler = {
  mountNewRoot(element : ReactElement<any>) : OpaqueID;
};

module.exports = function<T, P, I>(config : HostConfig<T, P, I>) : Reconciler {

  // const scheduleHighPriCallback = config.scheduleHighPriCallback;
  const scheduleLowPriCallback = config.scheduleLowPriCallback;

  let nextUnitOfWork : ?Fiber = null;

  function completeUnitOfWork(workInProgress : Fiber) : ?Fiber {
    while (true) {
      // The current, flushed, state of this fiber is the alternate.
      // Ideally nothing should rely on this, but relying on it here
      // means that we don't need an additional field on the work in
      // progress.
      const current = workInProgress.alternate;
      const next = completeWork(current, workInProgress);
      if (next) {
        // If completing this work spawned new work, do that next.
        return next;
      } else if (workInProgress.sibling) {
        // If there is more work to do in this parent, do that next.
        return workInProgress.sibling;
      } else if (workInProgress.parent) {
        // If there's no more work in this parent. Complete the parent.
        // TODO: Stop using the parent for this purpose. I think this will break
        // down in edge cases because when nodes are reused during bailouts, we
        // don't know which of two parents was used. Instead we should maintain
        // a temporary manual stack.
        // $FlowFixMe: This downcast is not safe. It is intentionally an error.
        workInProgress = workInProgress.parent;
      } else {
        // If we're at the root, there's no more work to do.
        return null;
      }
    }
  }

  function performUnitOfWork(workInProgress : Fiber) : ?Fiber {
    // The current, flushed, state of this fiber is the alternate.
    // Ideally nothing should rely on this, but relying on it here
    // means that we don't need an additional field on the work in
    // progress.
    const current = workInProgress.alternate;
    const next = beginWork(current, workInProgress);
    if (next) {
      // If this spawns new work, do that next.
      return next;
    } else {
      // Otherwise, complete the current work.
      return completeUnitOfWork(workInProgress);
    }
  }

  function performLowPriWork(deadline : Deadline) {
    while (nextUnitOfWork) {
      if (deadline.timeRemaining() > timeHeuristicForUnitOfWork) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      } else {
        scheduleLowPriCallback(performLowPriWork);
        break;
      }
    }
  }

  function ensureLowPriIsScheduled() {
    if (nextUnitOfWork) {
      return;
    }
    scheduleLowPriCallback(performLowPriWork);
  }

  /*
  function performHighPriWork() {
    // There is no such thing as high pri work yet.
  }

  function ensureHighPriIsScheduled() {
    scheduleHighPriCallback(performHighPriWork);
  }
  */

  let rootFiber : ?Fiber = null;

  return {

    mountNewRoot(element : ReactElement<any>) : OpaqueID {

      ensureLowPriIsScheduled();

      // TODO: Unify this with ReactChildFiber. We can't now because the parent
      // is passed. Should be doable though. Might require a wrapper don't know.
      if (rootFiber && rootFiber.type === element.type && rootFiber.key === element.key) {
        nextUnitOfWork = ReactFiber.cloneFiber(rootFiber);
        nextUnitOfWork.pendingProps = element.props;
        return {};
      }

      nextUnitOfWork = rootFiber = ReactFiber.createFiberFromElement(element);

      return {};
    },

  };
};
