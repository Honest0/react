/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import './ReactNativeInjectionShared';

import * as ReactFabricComponentTree from './ReactFabricComponentTree';
import * as EventPluginUtils from 'events/EventPluginUtils';
import ReactFabricGlobalResponderHandler from './ReactFabricGlobalResponderHandler';
import ResponderEventPlugin from 'events/ResponderEventPlugin';

EventPluginUtils.injection.injectComponentTree(ReactFabricComponentTree);

ResponderEventPlugin.injection.injectGlobalResponderHandler(
  ReactFabricGlobalResponderHandler,
);
