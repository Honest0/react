/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {__DEBUG__} from 'react-devtools-shared/src/constants';

import type {HooksTree} from 'react-debug-tools/src/ReactDebugHooks';
import type {Thenable, Wakeable} from 'shared/ReactTypes';
import type {Element} from './devtools/views/Components/types';
import type {
  HookNames,
  HookSourceLocationKey,
} from 'react-devtools-shared/src/types';
import type {HookSource} from 'react-debug-tools/src/ReactDebugHooks';

const TIMEOUT = 5000;

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

type PendingRecord = {|
  status: 0,
  value: Wakeable,
|};

type ResolvedRecord<T> = {|
  status: 1,
  value: T,
|};

type RejectedRecord = {|
  status: 2,
  value: null,
|};

type Record<T> = PendingRecord | ResolvedRecord<T> | RejectedRecord;

function readRecord<T>(record: Record<T>): ResolvedRecord<T> | RejectedRecord {
  if (record.status === Resolved) {
    // This is just a type refinement.
    return record;
  } else if (record.status === Rejected) {
    // This is just a type refinement.
    return record;
  } else {
    throw record.value;
  }
}

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// TODO Rethink this if the React API constraints change.
// See https://github.com/reactwg/react-18/discussions/25#discussioncomment-980435
let map: WeakMap<Element, Record<HookNames>> = new WeakMap();

export function hasAlreadyLoadedHookNames(element: Element): boolean {
  const record = map.get(element);
  return record != null && record.status === Resolved;
}

export function loadHookNames(
  element: Element,
  hooksTree: HooksTree,
  loadHookNamesFunction: (hookLog: HooksTree) => Thenable<HookNames>,
): HookNames | null {
  let record = map.get(element);

  if (__DEBUG__) {
    console.groupCollapsed('loadHookNames() record:');
    console.log(record);
    console.groupEnd();
  }

  if (!record) {
    const callbacks = new Set();
    const wakeable: Wakeable = {
      then(callback) {
        callbacks.add(callback);
      },
    };

    const wake = () => {
      if (timeoutID) {
        clearTimeout(timeoutID);
        timeoutID = null;
      }

      // This assumes they won't throw.
      callbacks.forEach(callback => callback());
      callbacks.clear();
    };

    const newRecord: Record<HookNames> = (record = {
      status: Pending,
      value: wakeable,
    });

    let didTimeout = false;

    loadHookNamesFunction(hooksTree).then(
      function onSuccess(hookNames) {
        if (didTimeout) {
          return;
        }

        if (__DEBUG__) {
          console.log('[hookNamesCache] onSuccess() hookNames:', hookNames);
        }

        if (hookNames) {
          const resolvedRecord = ((newRecord: any): ResolvedRecord<HookNames>);
          resolvedRecord.status = Resolved;
          resolvedRecord.value = hookNames;
        } else {
          const notFoundRecord = ((newRecord: any): RejectedRecord);
          notFoundRecord.status = Rejected;
          notFoundRecord.value = null;
        }

        wake();
      },
      function onError(error) {
        if (didTimeout) {
          return;
        }

        if (__DEBUG__) {
          console.log('[hookNamesCache] onError() error:', error);
        }

        const thrownRecord = ((newRecord: any): RejectedRecord);
        thrownRecord.status = Rejected;
        thrownRecord.value = null;

        wake();
      },
    );

    // Eventually timeout and stop trying to load names.
    let timeoutID = setTimeout(function onTimeout() {
      if (__DEBUG__) {
        console.log('[hookNamesCache] onTimeout()');
      }

      timeoutID = null;

      didTimeout = true;

      const timedoutRecord = ((newRecord: any): RejectedRecord);
      timedoutRecord.status = Rejected;
      timedoutRecord.value = null;

      wake();
    }, TIMEOUT);

    map.set(element, record);
  }

  const response = readRecord(record).value;
  return response;
}

export function getHookSourceLocationKey({
  fileName,
  lineNumber,
  columnNumber,
}: HookSource): HookSourceLocationKey {
  if (fileName == null || lineNumber == null || columnNumber == null) {
    throw Error('Hook source code location not found.');
  }
  return `${fileName}:${lineNumber}:${columnNumber}`;
}

export function clearHookNamesCache(): void {
  map = new WeakMap();
}
