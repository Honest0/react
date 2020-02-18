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
import typeof * as ExportsType from './ReactFeatureFlags.testing.www';

export const debugRenderPhaseSideEffectsForStrictMode = false;
export const enableUserTimingAPI = false;
export const warnAboutDeprecatedLifecycles = true;
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = false;
export const enableProfilerTimer = false;
export const enableSchedulerTracing = false;
export const enableSuspenseServerRenderer = true;
export const enableSelectiveHydration = true;
export const enableChunksAPI = true;
export const disableJavaScriptURLs = true;
export const disableInputAttributeSyncing = false;
export const exposeConcurrentModeAPIs = true;
export const warnAboutShorthandPropertyCollision = true;
export const enableSchedulerDebugging = false;
export const enableDeprecatedFlareAPI = true;
export const enableFundamentalAPI = false;
export const enableScopeAPI = true;
export const enableJSXTransformAPI = true;
export const warnAboutUnmockedScheduler = true;
export const flushSuspenseFallbacksInTests = true;
export const enableSuspenseCallback = true;
export const warnAboutDefaultPropsOnFunctionComponents = false;
export const warnAboutStringRefs = false;
export const disableLegacyContext = __EXPERIMENTAL__;
export const disableSchedulerTimeoutBasedOnReactExpirationTime = false;
export const enableTrainModelFix = true;
export const enableTrustedTypesIntegration = false;
export const enableNativeTargetAsInstance = false;
export const disableCreateFactory = __EXPERIMENTAL__;
export const disableLegacyReactDOMAPIs = __EXPERIMENTAL__;
export const disableTextareaChildren = __EXPERIMENTAL__;
export const disableMapsAsChildren = __EXPERIMENTAL__;
export const disableUnstableRenderSubtreeIntoContainer = __EXPERIMENTAL__;
export const warnUnstableRenderSubtreeIntoContainer = false;
export const disableUnstableCreatePortal = __EXPERIMENTAL__;
export const deferPassiveEffectCleanupDuringUnmount = false;
export const runAllPassiveEffectDestroysBeforeCreates = false;
export const isTestEnvironment = true;

// Only used in www builds.
export function addUserTimingListener() {
  invariant(false, 'Not implemented.');
}

// Flow magic to verify the exports of this file match the original version.
// eslint-disable-next-line no-unused-vars
type Check<_X, Y: _X, X: Y = _X> = null;
// eslint-disable-next-line no-unused-expressions
(null: Check<ExportsType, FeatureFlagsType>);
