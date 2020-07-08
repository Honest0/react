/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Lane, Lanes} from './ReactFiberLane';
import type {Fiber} from './ReactInternalTypes';
import type {Wakeable} from 'shared/ReactTypes';

import {enableSchedulingProfiler} from 'shared/ReactFeatureFlags';
import getComponentName from 'shared/getComponentName';
import {getStackByFiberInDevAndProd} from './ReactFiberComponentStack';

/**
 * If performance exists and supports the subset of the User Timing API that we
 * require.
 */
const supportsUserTiming =
  typeof performance !== 'undefined' && typeof performance.mark === 'function';

function formatLanes(laneOrLanes: Lane | Lanes): string {
  return ((laneOrLanes: any): number).toString();
}

export function markCommitStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark(`--commit-start-${formatLanes(lanes)}`);
    }
  }
}

export function markCommitStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark('--commit-stop');
    }
  }
}

const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;

// $FlowFixMe: Flow cannot handle polymorphic WeakMaps
const wakeableIDs: WeakMap<Wakeable, number> = new PossiblyWeakMap();
let wakeableID: number = 0;
function getWakeableID(wakeable: Wakeable): number {
  if (!wakeableIDs.has(wakeable)) {
    wakeableIDs.set(wakeable, wakeableID++);
  }
  return ((wakeableIDs.get(wakeable): any): number);
}

// $FlowFixMe: Flow cannot handle polymorphic WeakMaps
const cachedFiberStacks: WeakMap<Fiber, string> = new PossiblyWeakMap();
function cacheFirstGetComponentStackByFiber(fiber: Fiber): string {
  if (cachedFiberStacks.has(fiber)) {
    return ((cachedFiberStacks.get(fiber): any): string);
  } else {
    const alternate = fiber.alternate;
    if (alternate !== null && cachedFiberStacks.has(alternate)) {
      return ((cachedFiberStacks.get(alternate): any): string);
    }
  }
  // TODO (brian) Generate and store temporary ID so DevTools can match up a component stack later.
  const componentStack = getStackByFiberInDevAndProd(fiber) || '';
  cachedFiberStacks.set(fiber, componentStack);
  return componentStack;
}

export function markComponentSuspended(fiber: Fiber, wakeable: Wakeable): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      const id = getWakeableID(wakeable);
      const componentName = getComponentName(fiber.type) || 'Unknown';
      const componentStack = cacheFirstGetComponentStackByFiber(fiber);
      performance.mark(
        `--suspense-suspend-${id}-${componentName}-${componentStack}`,
      );
      wakeable.then(
        () =>
          performance.mark(
            `--suspense-resolved-${id}-${componentName}-${componentStack}`,
          ),
        () =>
          performance.mark(
            `--suspense-rejected-${id}-${componentName}-${componentStack}`,
          ),
      );
    }
  }
}

export function markLayoutEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark(`--layout-effects-start-${formatLanes(lanes)}`);
    }
  }
}

export function markLayoutEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark('--layout-effects-stop');
    }
  }
}

export function markPassiveEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark(`--passive-effects-start-${formatLanes(lanes)}`);
    }
  }
}

export function markPassiveEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark('--passive-effects-stop');
    }
  }
}

export function markRenderStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark(`--render-start-${formatLanes(lanes)}`);
    }
  }
}

export function markRenderYielded(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark('--render-yield');
    }
  }
}

export function markRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark('--render-stop');
    }
  }
}

export function markRenderScheduled(lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      performance.mark(`--schedule-render-${formatLanes(lane)}`);
    }
  }
}

export function markForceUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      const componentName = getComponentName(fiber.type) || 'Unknown';
      const componentStack = cacheFirstGetComponentStackByFiber(fiber);
      performance.mark(
        `--schedule-forced-update-${formatLanes(
          lane,
        )}-${componentName}-${componentStack}`,
      );
    }
  }
}

export function markStateUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTiming) {
      const componentName = getComponentName(fiber.type) || 'Unknown';
      const componentStack = cacheFirstGetComponentStackByFiber(fiber);
      performance.mark(
        `--schedule-state-update-${formatLanes(
          lane,
        )}-${componentName}-${componentStack}`,
      );
    }
  }
}
