/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import invariant from 'shared/invariant';

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as PersistentFeatureFlagsType from './ReactFeatureFlags.persistent';

export const debugRenderPhaseSideEffectsForStrictMode = false;
export const enableUserTimingAPI = __DEV__;
export const warnAboutDeprecatedLifecycles = true;
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = false;
export const enableProfilerTimer = __PROFILE__;
export const enableSchedulerTracing = __PROFILE__;
export const enableSuspenseServerRenderer = false;
export const enableSelectiveHydration = false;
export const enableChunksAPI = false;
export const disableJavaScriptURLs = false;
export const disableInputAttributeSyncing = false;
export const exposeConcurrentModeAPIs = __EXPERIMENTAL__;
export const warnAboutShorthandPropertyCollision = false;
export const enableSchedulerDebugging = false;
export const enableDeprecatedFlareAPI = false;
export const enableFundamentalAPI = false;
export const enableScopeAPI = false;
export const enableJSXTransformAPI = false;
export const warnAboutUnmockedScheduler = false;
export const flushSuspenseFallbacksInTests = true;
export const enableSuspenseCallback = false;
export const warnAboutDefaultPropsOnFunctionComponents = false;
export const warnAboutStringRefs = false;
export const disableLegacyContext = false;
export const disableSchedulerTimeoutBasedOnReactExpirationTime = false;
export const enableTrainModelFix = false;
export const enableTrustedTypesIntegration = false;
export const enableNativeTargetAsInstance = false;
export const disableCreateFactory = false;
export const disableTextareaChildren = false;

// Only used in www builds.
export function addUserTimingListener() {
  invariant(false, 'Not implemented.');
}

// Flow magic to verify the exports of this file match the original version.
// eslint-disable-next-line no-unused-vars
type Check<_X, Y: _X, X: Y = _X> = null;
// eslint-disable-next-line no-unused-expressions
(null: Check<PersistentFeatureFlagsType, FeatureFlagsType>);
