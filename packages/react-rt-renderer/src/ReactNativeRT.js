/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNativeRTType} from './ReactNativeRTTypes';
import type {ReactNodeList} from 'shared/ReactTypes';

/**
 * Make sure essential globals are available and are patched correctly. Please don't remove this
 * line. Bundles created by react-packager `require` it before executing any application code. This
 * ensures it exists in the dependency graph and can be `require`d.
 * TODO: require this in packager, not in React #10932517
 */
import 'InitializeCore';
import './ReactNativeRTEventEmitter';

// TODO: direct imports like some-package/src/* are bad. Fix me.
import * as ReactFiberErrorLogger from 'react-reconciler/src/ReactFiberErrorLogger';
import {showDialog} from 'react-native-renderer/src/ReactNativeFiberErrorDialog';
import * as ReactPortal from 'react-reconciler/src/ReactPortal';
import * as ReactGenericBatching from 'events/ReactGenericBatching';
import ReactVersion from 'shared/ReactVersion';

import {getFiberFromTag} from './ReactNativeRTComponentTree';
import ReactNativeRTFiberRenderer from './ReactNativeRTFiberRenderer';
import ReactNativeRTFiberInspector from './ReactNativeRTFiberInspector';

ReactGenericBatching.injection.injectFiberBatchedUpdates(
  ReactNativeRTFiberRenderer.batchedUpdates,
);

const roots = new Map();

// Intercept lifecycle errors and ensure they are shown with the correct stack
// trace within the native redbox component.
ReactFiberErrorLogger.injection.injectDialog(showDialog);

const ReactNativeRTFiber: ReactNativeRTType = {
  render(element: React$Element<any>, containerTag: any, callback: ?Function) {
    let root = roots.get(containerTag);

    if (!root) {
      // TODO (bvaughn): If we decide to keep the wrapper component,
      // We could create a wrapper for containerTag as well to reduce special casing.
      root = ReactNativeRTFiberRenderer.createContainer(containerTag, false);
      roots.set(containerTag, root);
    }
    ReactNativeRTFiberRenderer.updateContainer(element, root, null, callback);

    return ReactNativeRTFiberRenderer.getPublicRootInstance(root);
  },

  unmountComponentAtNode(containerTag: number) {
    const root = roots.get(containerTag);
    if (root) {
      // TODO: Is it safe to reset this now or should I wait since this unmount could be deferred?
      ReactNativeRTFiberRenderer.updateContainer(null, root, null, () => {
        roots.delete(containerTag);
      });
    }
  },

  createPortal(
    children: ReactNodeList,
    containerTag: number,
    key: ?string = null,
  ) {
    return ReactPortal.createPortal(children, containerTag, null, key);
  },

  unstable_batchedUpdates: ReactGenericBatching.batchedUpdates,

  flushSync: ReactNativeRTFiberRenderer.flushSync,
};

ReactNativeRTFiberRenderer.injectIntoDevTools({
  findFiberByHostInstance: getFiberFromTag,
  getInspectorDataForViewTag:
    ReactNativeRTFiberInspector.getInspectorDataForViewTag,
  bundleType: __DEV__ ? 1 : 0,
  version: ReactVersion,
  rendererPackageName: 'react-rt-renderer',
});

export default ReactNativeRTFiber;
