/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ExpirationTime} from 'react-reconciler/src/ReactFiberExpirationTime';
import type {FiberRoot} from 'react-reconciler/src/ReactFiberRoot';
import type {MutableSource, MutableSourceVersion} from 'shared/ReactTypes';

import {isPrimaryRenderer} from './ReactFiberHostConfig';
import {NoWork} from './ReactFiberExpirationTime';

// Work in progress version numbers only apply to a single render,
// and should be reset before starting a new render.
// This tracks which mutable sources need to be reset after a render.
let workInProgressPrimarySources: Array<MutableSource<any>> = [];
let workInProgressSecondarySources: Array<MutableSource<any>> = [];

let rendererSigil;
if (__DEV__) {
  // Used to detect multiple renderers using the same mutable source.
  rendererSigil = {};
}

export function clearPendingUpdates(
  root: FiberRoot,
  expirationTime: ExpirationTime,
): void {
  if (root.mutableSourcePendingUpdateTime <= expirationTime) {
    root.mutableSourcePendingUpdateTime = NoWork;
  }
}

export function getPendingExpirationTime(root: FiberRoot): ExpirationTime {
  return root.mutableSourcePendingUpdateTime;
}

export function setPendingExpirationTime(
  root: FiberRoot,
  expirationTime: ExpirationTime,
): void {
  root.mutableSourcePendingUpdateTime = expirationTime;
}

export function markSourceAsDirty(mutableSource: MutableSource<any>): void {
  if (isPrimaryRenderer) {
    workInProgressPrimarySources.push(mutableSource);
  } else {
    workInProgressSecondarySources.push(mutableSource);
  }
}

export function resetWorkInProgressVersions(): void {
  if (isPrimaryRenderer) {
    for (let i = 0; i < workInProgressPrimarySources.length; i++) {
      const mutableSource = workInProgressPrimarySources[i];
      mutableSource._workInProgressVersionPrimary = null;
    }
    workInProgressPrimarySources.length = 0;
  } else {
    for (let i = 0; i < workInProgressSecondarySources.length; i++) {
      const mutableSource = workInProgressSecondarySources[i];
      mutableSource._workInProgressVersionSecondary = null;
    }
    workInProgressSecondarySources.length = 0;
  }
}

export function getWorkInProgressVersion(
  mutableSource: MutableSource<any>,
): null | MutableSourceVersion {
  if (isPrimaryRenderer) {
    return mutableSource._workInProgressVersionPrimary;
  } else {
    return mutableSource._workInProgressVersionSecondary;
  }
}

export function setWorkInProgressVersion(
  mutableSource: MutableSource<any>,
  version: MutableSourceVersion,
): void {
  if (isPrimaryRenderer) {
    mutableSource._workInProgressVersionPrimary = version;
    workInProgressPrimarySources.push(mutableSource);
  } else {
    mutableSource._workInProgressVersionSecondary = version;
    workInProgressSecondarySources.push(mutableSource);
  }
}

export function warnAboutMultipleRenderersDEV(
  mutableSource: MutableSource<any>,
): void {
  if (__DEV__) {
    if (isPrimaryRenderer) {
      if (mutableSource._currentPrimaryRenderer == null) {
        mutableSource._currentPrimaryRenderer = rendererSigil;
      } else if (mutableSource._currentPrimaryRenderer !== rendererSigil) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same mutable source. This is currently unsupported.',
        );
      }
    } else {
      if (mutableSource._currentSecondaryRenderer == null) {
        mutableSource._currentSecondaryRenderer = rendererSigil;
      } else if (mutableSource._currentSecondaryRenderer !== rendererSigil) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same mutable source. This is currently unsupported.',
        );
      }
    }
  }
}
