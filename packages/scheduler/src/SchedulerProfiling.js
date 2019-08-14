/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {PriorityLevel} from './SchedulerPriorities';
import {enableProfiling} from './SchedulerFeatureFlags';

import {NoPriority} from './SchedulerPriorities';

let runIdCounter: number = 0;
let mainThreadIdCounter: number = 0;

const profilingStateSize = 4;
export const sharedProfilingBuffer =
  // $FlowFixMe Flow doesn't know about SharedArrayBuffer
  typeof SharedArrayBuffer === 'function'
    ? new SharedArrayBuffer(profilingStateSize * Int32Array.BYTES_PER_ELEMENT)
    : // $FlowFixMe Flow doesn't know about ArrayBuffer
      new ArrayBuffer(profilingStateSize * Int32Array.BYTES_PER_ELEMENT);

const profilingState = enableProfiling
  ? new Int32Array(sharedProfilingBuffer)
  : null;

const PRIORITY = 0;
const CURRENT_TASK_ID = 1;
const CURRENT_RUN_ID = 2;
const QUEUE_SIZE = 3;

if (enableProfiling && profilingState !== null) {
  profilingState[PRIORITY] = NoPriority;
  // This is maintained with a counter, because the size of the priority queue
  // array might include canceled tasks.
  profilingState[QUEUE_SIZE] = 0;
  profilingState[CURRENT_TASK_ID] = 0;
}

const INITIAL_EVENT_LOG_SIZE = 1000;

let eventLogSize = 0;
let eventLogBuffer = null;
let eventLog = null;
let eventLogIndex = 0;

const TaskStartEvent = 1;
const TaskCompleteEvent = 2;
const TaskErrorEvent = 3;
const TaskCancelEvent = 4;
const TaskRunEvent = 5;
const TaskYieldEvent = 6;
const SchedulerSuspendEvent = 7;
const SchedulerResumeEvent = 8;

function logEvent(entries) {
  if (eventLog !== null) {
    const offset = eventLogIndex;
    eventLogIndex += entries.length;
    if (eventLogIndex + 1 > eventLogSize) {
      eventLogSize = eventLogIndex + 1;
      const newEventLog = new Int32Array(
        eventLogSize * Int32Array.BYTES_PER_ELEMENT,
      );
      newEventLog.set(eventLog);
      eventLogBuffer = newEventLog.buffer;
      eventLog = newEventLog;
    }
    eventLog.set(entries, offset);
  }
}

export function startLoggingProfilingEvents(): void {
  eventLogSize = INITIAL_EVENT_LOG_SIZE;
  eventLogBuffer = new ArrayBuffer(eventLogSize * Int32Array.BYTES_PER_ELEMENT);
  eventLog = new Int32Array(eventLogBuffer);
  eventLogIndex = 0;
}

export function stopLoggingProfilingEvents(): ArrayBuffer | null {
  const buffer = eventLogBuffer;
  eventLogBuffer = eventLog = null;
  return buffer;
}

export function markTaskStart(
  task: {id: number, priorityLevel: PriorityLevel},
  time: number,
) {
  if (enableProfiling) {
    if (profilingState !== null) {
      profilingState[QUEUE_SIZE]++;
    }
    if (eventLog !== null) {
      logEvent([TaskStartEvent, time, task.id, task.priorityLevel]);
    }
  }
}

export function markTaskCompleted(
  task: {
    id: number,
    priorityLevel: PriorityLevel,
  },
  time: number,
) {
  if (enableProfiling) {
    if (profilingState !== null) {
      profilingState[PRIORITY] = NoPriority;
      profilingState[CURRENT_TASK_ID] = 0;
      profilingState[QUEUE_SIZE]--;
    }

    if (eventLog !== null) {
      logEvent([TaskCompleteEvent, time, task.id]);
    }
  }
}

export function markTaskCanceled(
  task: {
    id: number,
    priorityLevel: PriorityLevel,
  },
  time: number,
) {
  if (enableProfiling) {
    if (profilingState !== null) {
      profilingState[QUEUE_SIZE]--;
    }

    if (eventLog !== null) {
      logEvent([TaskCancelEvent, time, task.id]);
    }
  }
}

export function markTaskErrored(
  task: {
    id: number,
    priorityLevel: PriorityLevel,
  },
  time: number,
) {
  if (enableProfiling) {
    if (profilingState !== null) {
      profilingState[PRIORITY] = NoPriority;
      profilingState[CURRENT_TASK_ID] = 0;
      profilingState[QUEUE_SIZE]--;
    }

    if (eventLog !== null) {
      logEvent([TaskErrorEvent, time, task.id]);
    }
  }
}

export function markTaskRun(
  task: {id: number, priorityLevel: PriorityLevel},
  time: number,
) {
  if (enableProfiling) {
    runIdCounter++;

    if (profilingState !== null) {
      profilingState[PRIORITY] = task.priorityLevel;
      profilingState[CURRENT_TASK_ID] = task.id;
      profilingState[CURRENT_RUN_ID] = runIdCounter;
    }

    if (eventLog !== null) {
      logEvent([TaskRunEvent, time, task.id, runIdCounter]);
    }
  }
}

export function markTaskYield(task: {id: number}, time: number) {
  if (enableProfiling) {
    if (profilingState !== null) {
      profilingState[PRIORITY] = NoPriority;
      profilingState[CURRENT_TASK_ID] = 0;
      profilingState[CURRENT_RUN_ID] = 0;
    }

    if (eventLog !== null) {
      logEvent([TaskYieldEvent, time, task.id, runIdCounter]);
    }
  }
}

export function markSchedulerSuspended(time: number) {
  if (enableProfiling) {
    mainThreadIdCounter++;

    if (eventLog !== null) {
      logEvent([SchedulerSuspendEvent, time, mainThreadIdCounter]);
    }
  }
}

export function markSchedulerUnsuspended(time: number) {
  if (enableProfiling) {
    if (eventLog !== null) {
      logEvent([SchedulerResumeEvent, time, mainThreadIdCounter]);
    }
  }
}
