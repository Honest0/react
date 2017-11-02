/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FeatureFlags} from 'shared/ReactFeatureFlags';

var ReactNativeCSFeatureFlags: FeatureFlags = {
  enableAsyncSubtreeAPI: true,
  enableAsyncSchedulingByDefaultInReactDOM: false,
  enableReactFragment: false,
  enableCreateRoot: false,
  // React Native CS uses persistent reconciler.
  enableMutatingReconciler: false,
  enableNoopReconciler: false,
  enablePersistentReconciler: true,
};

export default ReactNativeCSFeatureFlags;
