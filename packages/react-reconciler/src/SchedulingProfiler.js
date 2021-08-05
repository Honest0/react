/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Lane, Lanes} from './ReactFiberLane.old';
import type {Fiber} from './ReactInternalTypes';
import type {Wakeable} from 'shared/ReactTypes';

import {
  enableNewReconciler,
  enableSchedulingProfiler,
} from 'shared/ReactFeatureFlags';
import ReactVersion from 'shared/ReactVersion';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import {SCHEDULING_PROFILER_VERSION} from 'react-devtools-scheduling-profiler/src/constants';

import {
  getLabelForLane as getLabelForLane_old,
  TotalLanes as TotalLanes_old,
} from 'react-reconciler/src/ReactFiberLane.old';
import {
  getLabelForLane as getLabelForLane_new,
  TotalLanes as TotalLanes_new,
} from 'react-reconciler/src/ReactFiberLane.new';

const getLabelForLane = enableNewReconciler
  ? getLabelForLane_new
  : getLabelForLane_old;

const TotalLanes = enableNewReconciler ? TotalLanes_new : TotalLanes_old;

/**
 * If performance exists and supports the subset of the User Timing API that we
 * require.
 */
const supportsUserTiming =
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.clearMarks === 'function';

let supportsUserTimingV3 = false;
if (enableSchedulingProfiler) {
  if (supportsUserTiming) {
    const CHECK_V3_MARK = '__v3';
    const markOptions = {};
    // $FlowFixMe: Ignore Flow complaining about needing a value
    Object.defineProperty(markOptions, 'startTime', {
      get: function() {
        supportsUserTimingV3 = true;
        return 0;
      },
      set: function() {},
    });

    try {
      // $FlowFixMe: Flow expects the User Timing level 2 API.
      performance.mark(CHECK_V3_MARK, markOptions);
    } catch (error) {
      // Ignore
    } finally {
      performance.clearMarks(CHECK_V3_MARK);
    }
  }
}

const laneLabels: Array<string> = [];

export function getLaneLabels(): Array<string> {
  if (laneLabels.length === 0) {
    let lane = 1;
    for (let index = 0; index < TotalLanes; index++) {
      laneLabels.push(((getLabelForLane(lane): any): string));

      lane *= 2;
    }
  }
  return laneLabels;
}

function markLaneToLabelMetadata() {
  getLaneLabels();

  markAndClear(`--react-lane-labels-${laneLabels.join(',')}`);
}

function markAndClear(name) {
  performance.mark(name);
  performance.clearMarks(name);
}

function markVersionMetadata() {
  markAndClear(`--react-version-${ReactVersion}`);
  markAndClear(`--profiler-version-${SCHEDULING_PROFILER_VERSION}`);
}

export function markCommitStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--commit-start-${lanes}`);

      // Certain types of metadata should be logged infrequently.
      // Normally we would log this during module init,
      // but there's no guarantee a user is profiling at that time.
      // Commits happen infrequently (less than renders or state updates)
      // so we log this extra information along with a commit.
      // It will likely be logged more than once but that's okay.
      //
      // TODO Once DevTools supports starting/stopping the profiler,
      // we can log this data only once (when started) and remove the per-commit logging.
      markVersionMetadata();
      markLaneToLabelMetadata();
    }
  }
}

export function markCommitStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--commit-stop');
    }
  }
}

export function markComponentRenderStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(`--component-render-start-${componentName}`);
    }
  }
}

export function markComponentRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--component-render-stop');
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

export function markComponentSuspended(
  fiber: Fiber,
  wakeable: Wakeable,
  lanes: Lanes,
): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const eventType = wakeableIDs.has(wakeable) ? 'resuspend' : 'suspend';
      const id = getWakeableID(wakeable);
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      const phase = fiber.alternate === null ? 'mount' : 'update';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(
        `--suspense-${eventType}-${id}-${componentName}-${phase}-${lanes}`,
      );
      wakeable.then(
        () => markAndClear(`--suspense-resolved-${id}-${componentName}`),
        () => markAndClear(`--suspense-rejected-${id}-${componentName}`),
      );
    }
  }
}

export function markLayoutEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--layout-effects-start-${lanes}`);
    }
  }
}

export function markLayoutEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--layout-effects-stop');
    }
  }
}

export function markPassiveEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--passive-effects-start-${lanes}`);
    }
  }
}

export function markPassiveEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--passive-effects-stop');
    }
  }
}

export function markRenderStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--render-start-${lanes}`);
    }
  }
}

export function markRenderYielded(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--render-yield');
    }
  }
}

export function markRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--render-stop');
    }
  }
}

export function markRenderScheduled(lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--schedule-render-${lane}`);
    }
  }
}

export function markForceUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(`--schedule-forced-update-${lane}-${componentName}`);
    }
  }
}

export function markStateUpdateScheduled(fiber: Fiber, lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(`--schedule-state-update-${lane}-${componentName}`);
    }
  }
}
