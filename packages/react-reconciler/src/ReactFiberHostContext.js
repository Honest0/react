/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Container, HostContext} from './ReactFiberHostConfig';
import {enableNewReconciler} from 'shared/ReactFeatureFlags';

import {
  getCurrentRootHostContainer as getCurrentRootHostContainer_old,
  getHostContext as getHostContext_old,
} from './ReactFiberHostContext.old';

import {
  getCurrentRootHostContainer as getCurrentRootHostContainer_new,
  getHostContext as getHostContext_new,
} from './ReactFiberHostContext.new';

export function getCurrentRootHostContainer(): null | Container {
  return enableNewReconciler
    ? getCurrentRootHostContainer_new()
    : getCurrentRootHostContainer_old();
}

export function getHostContext(): HostContext {
  return enableNewReconciler ? getHostContext_new() : getHostContext_old();
}
