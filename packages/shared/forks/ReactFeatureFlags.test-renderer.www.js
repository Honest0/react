/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as ExportsType from './ReactFeatureFlags.test-renderer.www';

export const debugRenderPhaseSideEffectsForStrictMode = false;
export const warnAboutDeprecatedLifecycles = true;
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = false;
export const enableProfilerTimer = __PROFILE__;
export const enableProfilerCommitHooks = false;
export const enableSchedulerTracing = __PROFILE__;
export const enableSuspenseServerRenderer = false;
export const enableSelectiveHydration = false;
export const enableBlocksAPI = false;
export const enableSchedulerDebugging = false;
export const disableJavaScriptURLs = false;
export const disableInputAttributeSyncing = false;
export const enableDeprecatedFlareAPI = true;
export const enableFundamentalAPI = false;
export const enableScopeAPI = true;
export const enableUseEventAPI = true;
export const warnAboutUnmockedScheduler = true;
export const flushSuspenseFallbacksInTests = true;
export const enableSuspenseCallback = true;
export const warnAboutDefaultPropsOnFunctionComponents = false;
export const warnAboutStringRefs = false;
export const disableLegacyContext = false;
export const disableSchedulerTimeoutBasedOnReactExpirationTime = false;
export const enableTrustedTypesIntegration = false;
export const disableTextareaChildren = false;
export const disableModulePatternComponents = false;
export const warnUnstableRenderSubtreeIntoContainer = false;
export const deferPassiveEffectCleanupDuringUnmount = true;
export const runAllPassiveEffectDestroysBeforeCreates = true;
export const enableModernEventSystem = false;
export const warnAboutSpreadingKeyToJSX = false;
export const enableComponentStackLocations = false;
export const enableLegacyFBSupport = false;

// Internal-only attempt to debug a React Native issue. See D20130868.
export const throwEarlyForMysteriousError = false;

export const enableNewReconciler = false;

// Flow magic to verify the exports of this file match the original version.
// eslint-disable-next-line no-unused-vars
type Check<_X, Y: _X, X: Y = _X> = null;
// eslint-disable-next-line no-unused-expressions
(null: Check<ExportsType, FeatureFlagsType>);
