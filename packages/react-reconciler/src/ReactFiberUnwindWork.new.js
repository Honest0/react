/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane.new';
import type {SuspenseState} from './ReactFiberSuspenseComponent.new';
import type {Cache, SpawnedCachePool} from './ReactFiberCacheComponent.new';

import {resetWorkInProgressVersions as resetMutableSourceWorkInProgressVersions} from './ReactMutableSource.new';
import {
  ClassComponent,
  HostRoot,
  HostComponent,
  HostPortal,
  ContextProvider,
  SuspenseComponent,
  SuspenseListComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
} from './ReactWorkTags';
import {DidCapture, NoFlags, ShouldCapture} from './ReactFiberFlags';
import {NoMode, ProfileMode} from './ReactTypeOfMode';
import {
  enableSuspenseServerRenderer,
  enableProfilerTimer,
  enableCache,
} from 'shared/ReactFeatureFlags';

import {popHostContainer, popHostContext} from './ReactFiberHostContext.new';
import {popSuspenseContext} from './ReactFiberSuspenseContext.new';
import {resetHydrationState} from './ReactFiberHydrationContext.new';
import {
  isContextProvider as isLegacyContextProvider,
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberContext.new';
import {popProvider} from './ReactFiberNewContext.new';
import {popRenderLanes} from './ReactFiberWorkLoop.new';
import {
  popCacheProvider,
  popRootCachePool,
  popCachePool,
} from './ReactFiberCacheComponent.new';
import {transferActualDuration} from './ReactProfilerTimer.new';

import invariant from 'shared/invariant';

function unwindWork(workInProgress: Fiber, renderLanes: Lanes) {
  switch (workInProgress.tag) {
    case ClassComponent: {
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case HostRoot: {
      if (enableCache) {
        const root: FiberRoot = workInProgress.stateNode;
        popRootCachePool(root, renderLanes);

        const cache: Cache = workInProgress.memoizedState.cache;
        popCacheProvider(workInProgress, cache);
      }
      popHostContainer(workInProgress);
      popTopLevelLegacyContextObject(workInProgress);
      resetMutableSourceWorkInProgressVersions();
      const flags = workInProgress.flags;
      invariant(
        (flags & DidCapture) === NoFlags,
        'The root failed to unmount after an error. This is likely a bug in ' +
          'React. Please file an issue.',
      );
      workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
      return workInProgress;
    }
    case HostComponent: {
      // TODO: popHydrationState
      popHostContext(workInProgress);
      return null;
    }
    case SuspenseComponent: {
      popSuspenseContext(workInProgress);
      if (enableSuspenseServerRenderer) {
        const suspenseState: null | SuspenseState =
          workInProgress.memoizedState;
        if (suspenseState !== null && suspenseState.dehydrated !== null) {
          invariant(
            workInProgress.alternate !== null,
            'Threw in newly mounted dehydrated component. This is likely a bug in ' +
              'React. Please file an issue.',
          );
          resetHydrationState();
        }
      }
      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        // Captured a suspense effect. Re-render the boundary.
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case SuspenseListComponent: {
      popSuspenseContext(workInProgress);
      // SuspenseList doesn't actually catch anything. It should've been
      // caught by a nested boundary. If not, it should bubble through.
      return null;
    }
    case HostPortal:
      popHostContainer(workInProgress);
      return null;
    case ContextProvider:
      const context: ReactContext<any> = workInProgress.type._context;
      popProvider(context, workInProgress);
      return null;
    case OffscreenComponent:
    case LegacyHiddenComponent:
      popRenderLanes(workInProgress);
      if (enableCache) {
        const spawnedCachePool: SpawnedCachePool | null = (workInProgress.updateQueue: any);
        if (spawnedCachePool !== null) {
          popCachePool(workInProgress);
        }
      }
      return null;
    case CacheComponent:
      if (enableCache) {
        const cache: Cache = workInProgress.memoizedState.cache;
        popCacheProvider(workInProgress, cache);
      }
      return null;
    default:
      return null;
  }
}

function unwindInterruptedWork(interruptedWork: Fiber, renderLanes: Lanes) {
  switch (interruptedWork.tag) {
    case ClassComponent: {
      const childContextTypes = interruptedWork.type.childContextTypes;
      if (childContextTypes !== null && childContextTypes !== undefined) {
        popLegacyContext(interruptedWork);
      }
      break;
    }
    case HostRoot: {
      if (enableCache) {
        const root: FiberRoot = interruptedWork.stateNode;
        popRootCachePool(root, renderLanes);

        const cache: Cache = interruptedWork.memoizedState.cache;
        popCacheProvider(interruptedWork, cache);
      }
      popHostContainer(interruptedWork);
      popTopLevelLegacyContextObject(interruptedWork);
      resetMutableSourceWorkInProgressVersions();
      break;
    }
    case HostComponent: {
      popHostContext(interruptedWork);
      break;
    }
    case HostPortal:
      popHostContainer(interruptedWork);
      break;
    case SuspenseComponent:
      popSuspenseContext(interruptedWork);
      break;
    case SuspenseListComponent:
      popSuspenseContext(interruptedWork);
      break;
    case ContextProvider:
      const context: ReactContext<any> = interruptedWork.type._context;
      popProvider(context, interruptedWork);
      break;
    case OffscreenComponent:
    case LegacyHiddenComponent:
      popRenderLanes(interruptedWork);
      if (enableCache) {
        const spawnedCachePool: SpawnedCachePool | null = (interruptedWork.updateQueue: any);
        if (spawnedCachePool !== null) {
          popCachePool(interruptedWork);
        }
      }

      break;
    case CacheComponent:
      if (enableCache) {
        const cache: Cache = interruptedWork.memoizedState.cache;
        popCacheProvider(interruptedWork, cache);
      }
      break;
    default:
      break;
  }
}

export {unwindWork, unwindInterruptedWork};
