/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactFiber';

import {PLUGIN_EVENT_SYSTEM} from 'legacy-events/EventSystemFlags';
import {
  getListener,
  runExtractedPluginEventsInBatch,
} from 'legacy-events/EventPluginHub';
import {registrationNameModules} from 'legacy-events/EventPluginRegistry';
import {batchedUpdates} from 'legacy-events/ReactGenericBatching';

import type {AnyNativeEvent} from 'legacy-events/PluginModuleType';
import {enableNativeTargetAsInstance} from 'shared/ReactFeatureFlags';
import type {TopLevelType} from 'legacy-events/TopLevelEventTypes';

export {getListener, registrationNameModules as registrationNames};

export function dispatchEvent(
  target: null | Object,
  topLevelType: TopLevelType,
  nativeEvent: AnyNativeEvent,
) {
  const targetFiber = (target: null | Fiber);

  let eventTarget = null;
  if (enableNativeTargetAsInstance) {
    if (targetFiber != null) {
      eventTarget = targetFiber.stateNode.canonical;
    }
  } else {
    eventTarget = nativeEvent.target;
  }

  batchedUpdates(function() {
    // Heritage plugin event system
    runExtractedPluginEventsInBatch(
      topLevelType,
      targetFiber,
      nativeEvent,
      eventTarget,
      PLUGIN_EVENT_SYSTEM,
    );
  });
  // React Native doesn't use ReactControlledComponent but if it did, here's
  // where it would do it.
}
