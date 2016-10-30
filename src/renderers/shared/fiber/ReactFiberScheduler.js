/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberScheduler
 * @flow
 */

'use strict';

import type { TrappedError } from 'ReactFiberErrorBoundary';
import type { Fiber } from 'ReactFiber';
import type { FiberRoot } from 'ReactFiberRoot';
import type { HostConfig } from 'ReactFiberReconciler';
import type { PriorityLevel } from 'ReactPriorityLevel';

var ReactFiberBeginWork = require('ReactFiberBeginWork');
var ReactFiberCompleteWork = require('ReactFiberCompleteWork');
var ReactFiberCommitWork = require('ReactFiberCommitWork');
var ReactCurrentOwner = require('ReactCurrentOwner');

var { cloneFiber } = require('ReactFiber');
var { trapError, acknowledgeErrorInBoundary } = require('ReactFiberErrorBoundary');

var {
  NoWork,
  LowPriority,
  AnimationPriority,
  SynchronousPriority,
} = require('ReactPriorityLevel');

var {
  NoEffect,
  Placement,
  Update,
  PlacementAndUpdate,
  Deletion,
} = require('ReactTypeOfSideEffect');

var {
  HostContainer,
} = require('ReactTypeOfWork');

if (__DEV__) {
  var ReactFiberInstrumentation = require('ReactFiberInstrumentation');
}

var timeHeuristicForUnitOfWork = 1;

module.exports = function<T, P, I, TI, C>(config : HostConfig<T, P, I, TI, C>) {
  // Use a closure to circumvent the circular dependency between the scheduler
  // and ReactFiberBeginWork. Don't know if there's a better way to do this.

  const { beginWork } = ReactFiberBeginWork(config, scheduleUpdate);
  const { completeWork } = ReactFiberCompleteWork(config);
  const { commitInsertion, commitDeletion, commitWork, commitLifeCycles } =
    ReactFiberCommitWork(config);

  const scheduleAnimationCallback = config.scheduleAnimationCallback;
  const scheduleDeferredCallback = config.scheduleDeferredCallback;

  // The default priority to use for updates.
  let defaultPriority : PriorityLevel = LowPriority;

  // The next work in progress fiber that we're currently working on.
  let nextUnitOfWork : ?Fiber = null;
  let nextPriorityLevel : PriorityLevel = NoWork;

  // Linked list of roots with scheduled work on them.
  let nextScheduledRoot : ?FiberRoot = null;
  let lastScheduledRoot : ?FiberRoot = null;

  function findNextUnitOfWork() {
    // Clear out roots with no more work on them.
    while (nextScheduledRoot && nextScheduledRoot.current.pendingWorkPriority === NoWork) {
      nextScheduledRoot.isScheduled = false;
      if (nextScheduledRoot === lastScheduledRoot) {
        nextScheduledRoot = null;
        lastScheduledRoot = null;
        nextPriorityLevel = NoWork;
        return null;
      }
      nextScheduledRoot = nextScheduledRoot.nextScheduledRoot;
    }
    let root = nextScheduledRoot;
    let highestPriorityRoot = null;
    let highestPriorityLevel = NoWork;
    while (root) {
      if (root.current.pendingWorkPriority !== NoWork && (
          highestPriorityLevel === NoWork ||
          highestPriorityLevel > root.current.pendingWorkPriority)) {
        highestPriorityLevel = root.current.pendingWorkPriority;
        highestPriorityRoot = root;
      }
      // We didn't find anything to do in this root, so let's try the next one.
      root = root.nextScheduledRoot;
    }
    if (highestPriorityRoot) {
      nextPriorityLevel = highestPriorityLevel;
      return cloneFiber(
        highestPriorityRoot.current,
        highestPriorityLevel
      );
    }

    nextPriorityLevel = NoWork;
    return null;
  }

  function commitAllWork(finishedWork : Fiber, ignoreUnmountingErrors : boolean) {
    // Commit all the side-effects within a tree.

    // Commit phase is meant to be atomic and non-interruptible.
    // Any errors raised in it should be handled after it is over
    // so that we don't end up in an inconsistent state due to user code.
    // We'll keep track of all caught errors and handle them later.
    let allTrappedErrors = null;

    // First, we'll perform all the host insertions, updates, deletions and
    // ref unmounts.
    let effectfulFiber = finishedWork.firstEffect;
    while (effectfulFiber) {
      switch (effectfulFiber.effectTag) {
        case Placement: {
          commitInsertion(effectfulFiber);
          // Clear the effect tag so that we know that this is inserted, before
          // any life-cycles like componentDidMount gets called.
          effectfulFiber.effectTag = NoWork;
          break;
        }
        case PlacementAndUpdate: {
          commitInsertion(effectfulFiber);
          const current = effectfulFiber.alternate;
          commitWork(current, effectfulFiber);
          // Clear the "placement" from effect tag so that we know that this is inserted, before
          // any life-cycles like componentDidMount gets called.
          effectfulFiber.effectTag = Update;
          break;
        }
        case Update: {
          const current = effectfulFiber.alternate;
          commitWork(current, effectfulFiber);
          break;
        }
        case Deletion: {
          // Deletion might cause an error in componentWillUnmount().
          // We will continue nevertheless and handle those later on.
          const trappedErrors = commitDeletion(effectfulFiber);
          // There is a special case where we completely ignore errors.
          // It happens when we already caught an error earlier, and the update
          // is caused by an error boundary trying to render an error message.
          // In this case, we want to blow away the tree without catching errors.
          if (trappedErrors && !ignoreUnmountingErrors) {
            if (!allTrappedErrors) {
              allTrappedErrors = trappedErrors;
            } else {
              allTrappedErrors.push.apply(allTrappedErrors, trappedErrors);
            }
          }
          break;
        }
      }
      effectfulFiber = effectfulFiber.nextEffect;
    }

    // Next, we'll perform all life-cycles and ref callbacks. Life-cycles
    // happens as a separate pass so that all effects in the entire tree have
    // already been invoked.
    effectfulFiber = finishedWork.firstEffect;
    while (effectfulFiber) {
      if (effectfulFiber.effectTag === Update ||
          effectfulFiber.effectTag === PlacementAndUpdate) {
        const current = effectfulFiber.alternate;
        const trappedError = commitLifeCycles(current, effectfulFiber);
        if (trappedError) {
          allTrappedErrors = allTrappedErrors || [];
          allTrappedErrors.push(trappedError);
        }
      }
      const next = effectfulFiber.nextEffect;
      // Ensure that we clean these up so that we don't accidentally keep them.
      // I'm not actually sure this matters because we can't reset firstEffect
      // and lastEffect since they're on every node, not just the effectful
      // ones. So we have to clean everything as we reuse nodes anyway.
      effectfulFiber.nextEffect = null;
      // Ensure that we reset the effectTag here so that we can rely on effect
      // tags to reason about the current life-cycle.
      effectfulFiber = next;
    }

    // Finally if the root itself had an effect, we perform that since it is not
    // part of the effect list.
    if (finishedWork.effectTag !== NoEffect) {
      const current = finishedWork.alternate;
      commitWork(current, finishedWork);
      const trappedError = commitLifeCycles(current, finishedWork);
      if (trappedError) {
        allTrappedErrors = allTrappedErrors || [];
        allTrappedErrors.push(trappedError);
      }
    }

    // Now that the tree has been committed, we can handle errors.
    if (allTrappedErrors) {
      handleErrors(allTrappedErrors);
    }
  }

  function resetWorkPriority(workInProgress : Fiber) {
    let newPriority = NoWork;
    // progressedChild is going to be the child set with the highest priority.
    // Either it is the same as child, or it just bailed out because it choose
    // not to do the work.
    let child = workInProgress.progressedChild;
    while (child) {
      // Ensure that remaining work priority bubbles up.
      if (child.pendingWorkPriority !== NoWork &&
          (newPriority === NoWork ||
          newPriority > child.pendingWorkPriority)) {
        newPriority = child.pendingWorkPriority;
      }
      child = child.sibling;
    }
    workInProgress.pendingWorkPriority = newPriority;
  }

  function completeUnitOfWork(workInProgress : Fiber, ignoreUnmountingErrors : boolean) : ?Fiber {
    while (true) {
      // The current, flushed, state of this fiber is the alternate.
      // Ideally nothing should rely on this, but relying on it here
      // means that we don't need an additional field on the work in
      // progress.
      const current = workInProgress.alternate;
      const next = completeWork(current, workInProgress);

      resetWorkPriority(workInProgress);

      // The work is now done. We don't need this anymore. This flags
      // to the system not to redo any work here.
      workInProgress.pendingProps = null;
      workInProgress.updateQueue = null;

      const returnFiber = workInProgress.return;

      if (returnFiber) {
        // Append all the effects of the subtree and this fiber onto the effect
        // list of the parent. The completion order of the children affects the
        // side-effect order.
        if (!returnFiber.firstEffect) {
          returnFiber.firstEffect = workInProgress.firstEffect;
        }
        if (workInProgress.lastEffect) {
          if (returnFiber.lastEffect) {
            returnFiber.lastEffect.nextEffect = workInProgress.firstEffect;
          }
          returnFiber.lastEffect = workInProgress.lastEffect;
        }

        // If this fiber had side-effects, we append it AFTER the children's
        // side-effects. We can perform certain side-effects earlier if
        // needed, by doing multiple passes over the effect list. We don't want
        // to schedule our own side-effect on our own list because if end up
        // reusing children we'll schedule this effect onto itself since we're
        // at the end.
        if (workInProgress.effectTag !== NoEffect) {
          if (returnFiber.lastEffect) {
            returnFiber.lastEffect.nextEffect = workInProgress;
          } else {
            returnFiber.firstEffect = workInProgress;
          }
          returnFiber.lastEffect = workInProgress;
        }
      }

      if (next) {
        // If completing this work spawned new work, do that next.
        return next;
      } else if (workInProgress.sibling) {
        // If there is more work to do in this returnFiber, do that next.
        return workInProgress.sibling;
      } else if (returnFiber) {
        // If there's no more work in this returnFiber. Complete the returnFiber.
        workInProgress = returnFiber;
        continue;
      } else {
        // If we're at the root, there's no more work to do. We can flush it.
        const root : FiberRoot = (workInProgress.stateNode : any);
        if (root.current === workInProgress) {
          throw new Error(
            'Cannot commit the same tree as before. This is probably a bug ' +
            'related to the return field.'
          );
        }
        root.current = workInProgress;
        // TODO: We can be smarter here and only look for more work in the
        // "next" scheduled work since we've already scanned passed. That
        // also ensures that work scheduled during reconciliation gets deferred.
        // const hasMoreWork = workInProgress.pendingWorkPriority !== NoWork;
        commitAllWork(workInProgress, ignoreUnmountingErrors);
        const nextWork = findNextUnitOfWork();
        // if (!nextWork && hasMoreWork) {
          // TODO: This can happen when some deep work completes and we don't
          // know if this was the last one. We should be able to keep track of
          // the highest priority still in the tree for one pass. But if we
          // terminate an update we don't know.
          // throw new Error('FiberRoots should not have flagged more work if there is none.');
        // }
        return nextWork;
      }
    }
  }

  function performUnitOfWork(workInProgress : Fiber, ignoreUnmountingErrors : boolean) : ?Fiber {
    // The current, flushed, state of this fiber is the alternate.
    // Ideally nothing should rely on this, but relying on it here
    // means that we don't need an additional field on the work in
    // progress.
    const current = workInProgress.alternate;

    if (__DEV__ && ReactFiberInstrumentation.debugTool) {
      ReactFiberInstrumentation.debugTool.onWillBeginWork(workInProgress);
    }
    // See if beginning this work spawns more work.
    let next = beginWork(current, workInProgress, nextPriorityLevel);
    if (__DEV__ && ReactFiberInstrumentation.debugTool) {
      ReactFiberInstrumentation.debugTool.onDidBeginWork(workInProgress);
    }

    if (!next) {
      if (__DEV__ && ReactFiberInstrumentation.debugTool) {
        ReactFiberInstrumentation.debugTool.onWillCompleteWork(workInProgress);
      }
      // If this doesn't spawn new work, complete the current work.
      next = completeUnitOfWork(workInProgress, ignoreUnmountingErrors);
      if (__DEV__ && ReactFiberInstrumentation.debugTool) {
        ReactFiberInstrumentation.debugTool.onDidCompleteWork(workInProgress);
      }
    }

    ReactCurrentOwner.current = null;

    return next;
  }

  function performDeferredWorkUnsafe(deadline) {
    if (!nextUnitOfWork) {
      nextUnitOfWork = findNextUnitOfWork();
    }
    while (nextUnitOfWork) {
      if (deadline.timeRemaining() > timeHeuristicForUnitOfWork) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork, false);
        if (!nextUnitOfWork) {
          // Find more work. We might have time to complete some more.
          nextUnitOfWork = findNextUnitOfWork();
        }
      } else {
        scheduleDeferredCallback(performDeferredWork);
        return;
      }
    }
  }

  function performDeferredWork(deadline) {
    try {
      performDeferredWorkUnsafe(deadline);
    } catch (error) {
      const failedUnitOfWork = nextUnitOfWork;
      // Reset because it points to the error boundary:
      nextUnitOfWork = null;
      if (!failedUnitOfWork) {
        // We shouldn't end up here because nextUnitOfWork
        // should always be set while work is being performed.
        throw error;
      }
      const trappedError = trapError(failedUnitOfWork, error);
      handleErrors([trappedError]);
    }
  }

  function scheduleDeferredWork(root : FiberRoot, priority : PriorityLevel) {
    // We must reset the current unit of work pointer so that we restart the
    // search from the root during the next tick, in case there is now higher
    // priority work somewhere earlier than before.
    if (priority <= nextPriorityLevel) {
      nextUnitOfWork = null;
    }

    // Set the priority on the root, without deprioritizing
    if (root.current.pendingWorkPriority === NoWork ||
        priority <= root.current.pendingWorkPriority) {
      root.current.pendingWorkPriority = priority;
    }

    if (root.isScheduled) {
      // If we're already scheduled, we can bail out.
      return;
    }
    root.isScheduled = true;
    if (lastScheduledRoot) {
      // Schedule ourselves to the end.
      lastScheduledRoot.nextScheduledRoot = root;
      lastScheduledRoot = root;
    } else {
      // We're the only work scheduled.
      nextScheduledRoot = root;
      lastScheduledRoot = root;

      scheduleDeferredCallback(performDeferredWork);
    }
  }

  function performAnimationWorkUnsafe() {
    // Always start from the root
    nextUnitOfWork = findNextUnitOfWork();
    while (nextUnitOfWork &&
           nextPriorityLevel !== NoWork) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork, false);
      if (!nextUnitOfWork) {
        // Keep searching for animation work until there's no more left
        nextUnitOfWork = findNextUnitOfWork();
      }
      // Stop if the next unit of work is low priority
      if (nextPriorityLevel > AnimationPriority) {
        scheduleDeferredCallback(performDeferredWork);
        return;
      }
    }
  }

  function performAnimationWork() {
    try {
      performAnimationWorkUnsafe();
    } catch (error) {
      const failedUnitOfWork = nextUnitOfWork;
      // Reset because it points to the error boundary:
      nextUnitOfWork = null;
      if (!failedUnitOfWork) {
        // We shouldn't end up here because nextUnitOfWork
        // should always be set while work is being performed.
        throw error;
      }
      const trappedError = trapError(failedUnitOfWork, error);
      handleErrors([trappedError]);
    }
  }

  function scheduleAnimationWork(root: FiberRoot, priorityLevel : PriorityLevel) {
    // Set the priority on the root, without deprioritizing
    if (root.current.pendingWorkPriority === NoWork ||
        priorityLevel <= root.current.pendingWorkPriority) {
      root.current.pendingWorkPriority = priorityLevel;
    }

    if (root.isScheduled) {
      // If we're already scheduled, we can bail out.
      return;
    }
    root.isScheduled = true;
    if (lastScheduledRoot) {
      // Schedule ourselves to the end.
      lastScheduledRoot.nextScheduledRoot = root;
      lastScheduledRoot = root;
    } else {
      // We're the only work scheduled.
      nextScheduledRoot = root;
      lastScheduledRoot = root;
      scheduleAnimationCallback(performAnimationWork);
    }
  }

  function scheduleErrorBoundaryWork(boundary : Fiber, priority) : FiberRoot {
    let root = null;
    let fiber = boundary;
    while (fiber) {
      fiber.pendingWorkPriority = priority;
      if (fiber.alternate) {
        fiber.alternate.pendingWorkPriority = priority;
      }
      if (!fiber.return) {
        if (fiber.tag === HostContainer) {
          // We found the root.
          // Remember it so we can update it.
          root = ((fiber.stateNode : any) : FiberRoot);
          break;
        } else {
          throw new Error('Invalid root');
        }
      }
      fiber = fiber.return;
    }
    if (!root) {
      throw new Error('Could not find root from the boundary.');
    }
    return root;
  }

  function handleErrors(initialTrappedErrors : Array<TrappedError>) : void {
    let nextTrappedErrors = initialTrappedErrors;
    let firstUncaughtError = null;

    // In each phase, we will attempt to pass errors to boundaries and re-render them.
    // If we get more errors, we propagate them to higher boundaries in the next iterations.
    while (nextTrappedErrors) {
      const trappedErrors = nextTrappedErrors;
      nextTrappedErrors = null;

      // Pass errors to all affected boundaries.
      const affectedBoundaries : Set<Fiber> = new Set();
      trappedErrors.forEach(trappedError => {
        const boundary = trappedError.boundary;
        const error = trappedError.error;
        if (!boundary) {
          firstUncaughtError = firstUncaughtError || error;
          return;
        }
        // Don't visit boundaries twice.
        if (affectedBoundaries.has(boundary)) {
          return;
        }
        // Give error boundary a chance to update its state.
        try {
          acknowledgeErrorInBoundary(boundary, error);
          affectedBoundaries.add(boundary);
        } catch (nextError) {
          // If it throws, propagate the error.
          nextTrappedErrors = nextTrappedErrors || [];
          nextTrappedErrors.push(trapError(boundary, nextError));
        }
      });

      // We will process an update caused by each error boundary synchronously.
      affectedBoundaries.forEach(boundary => {
        // FIXME: We only specify LowPriority here so that setState() calls from the error
        // boundaries are respected. Instead we should set default priority level or something
        // like this. Reconsider this piece when synchronous scheduling is in place.
        const priority = LowPriority;
        const root = scheduleErrorBoundaryWork(boundary, priority);
        // This should use findNextUnitOfWork() when synchronous scheduling is implemented.
        let fiber = cloneFiber(root.current, priority);
        try {
          while (fiber) {
            // TODO: this is the only place where we recurse and it's unfortunate.
            // (This may potentially get us into handleErrors() again.)
            fiber = performUnitOfWork(fiber, true);
          }
        } catch (nextError) {
          // If it throws, propagate the error.
          nextTrappedErrors = nextTrappedErrors || [];
          nextTrappedErrors.push(trapError(boundary, nextError));
        }
      });
    }

    ReactCurrentOwner.current = null;

    // Surface the first error uncaught by the boundaries to the user.
    if (firstUncaughtError) {
      // We need to make sure any future root can get scheduled despite these errors.
      // Currently after throwing, nothing gets scheduled because these fields are set.
      // FIXME: this is likely a wrong fix! It's still better than ignoring updates though.
      nextScheduledRoot = null;
      lastScheduledRoot = null;

      // Throw any unhandled errors.
      throw firstUncaughtError;
    }
  }

  function scheduleWork(root : FiberRoot) {
    if (defaultPriority === SynchronousPriority) {
      throw new Error('Not implemented yet');
    }

    if (defaultPriority === NoWork) {
      return;
    }
    if (defaultPriority > AnimationPriority) {
      scheduleDeferredWork(root, defaultPriority);
      return;
    }
    scheduleAnimationWork(root, defaultPriority);
  }

  function scheduleUpdate(fiber: Fiber, priorityLevel : PriorityLevel): void {
    while (true) {
      if (fiber.pendingWorkPriority === NoWork ||
          fiber.pendingWorkPriority >= priorityLevel) {
        fiber.pendingWorkPriority = priorityLevel;
      }
      if (fiber.alternate) {
        if (fiber.alternate.pendingWorkPriority === NoWork ||
            fiber.alternate.pendingWorkPriority >= priorityLevel) {
          fiber.alternate.pendingWorkPriority = priorityLevel;
        }
      }
      if (!fiber.return) {
        if (fiber.tag === HostContainer) {
          const root : FiberRoot = (fiber.stateNode : any);
          scheduleDeferredWork(root, priorityLevel);
          return;
        } else {
          throw new Error('Invalid root');
        }
      }
      fiber = fiber.return;
    }
  }

  function performWithPriority(priorityLevel : PriorityLevel, fn : Function) {
    const previousDefaultPriority = defaultPriority;
    defaultPriority = priorityLevel;
    try {
      fn();
    } finally {
      defaultPriority = previousDefaultPriority;
    }
  }

  return {
    scheduleWork: scheduleWork,
    scheduleDeferredWork: scheduleDeferredWork,
    performWithPriority: performWithPriority,
  };
};
