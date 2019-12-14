/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactFabricType, HostComponent} from './ReactNativeTypes';
import type {ReactNodeList} from 'shared/ReactTypes';

import './ReactFabricInjection';

import {
  findHostInstance,
  findHostInstanceWithWarning,
  batchedEventUpdates,
  batchedUpdates as batchedUpdatesImpl,
  discreteUpdates,
  flushDiscreteUpdates,
  createContainer,
  updateContainer,
  injectIntoDevTools,
  getPublicRootInstance,
} from 'react-reconciler/inline.fabric';

import {createPortal} from 'shared/ReactPortal';
import {setBatchingImplementation} from 'legacy-events/ReactGenericBatching';
import ReactVersion from 'shared/ReactVersion';

import NativeMethodsMixin from './NativeMethodsMixin';
import ReactNativeComponent from './ReactNativeComponent';
import {getClosestInstanceFromNode} from './ReactFabricComponentTree';
import {getInspectorDataForViewTag} from './ReactNativeFiberInspector';

import {LegacyRoot} from 'shared/ReactRootTags';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import getComponentName from 'shared/getComponentName';

const {dispatchCommand: fabricDispatchCommand} = nativeFabricUIManager;

const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;

function findHostInstance_DEPRECATED(
  componentOrHandle: any,
): ?React$ElementRef<HostComponent<mixed>> {
  if (__DEV__) {
    const owner = ReactCurrentOwner.current;
    if (owner !== null && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentName(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }
  if (componentOrHandle == null) {
    return null;
  }
  if (componentOrHandle._nativeTag) {
    return componentOrHandle;
  }
  if (componentOrHandle.canonical && componentOrHandle.canonical._nativeTag) {
    return componentOrHandle.canonical;
  }
  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findHostInstance_DEPRECATED',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  if (hostInstance == null) {
    return hostInstance;
  }
  if ((hostInstance: any).canonical) {
    // Fabric
    return (hostInstance: any).canonical;
  }
  return hostInstance;
}

function findNodeHandle(componentOrHandle: any): ?number {
  if (__DEV__) {
    const owner = ReactCurrentOwner.current;
    if (owner !== null && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentName(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }
  if (componentOrHandle == null) {
    return null;
  }
  if (typeof componentOrHandle === 'number') {
    // Already a node handle
    return componentOrHandle;
  }
  if (componentOrHandle._nativeTag) {
    return componentOrHandle._nativeTag;
  }
  if (componentOrHandle.canonical && componentOrHandle.canonical._nativeTag) {
    return componentOrHandle.canonical._nativeTag;
  }
  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findNodeHandle',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  if (hostInstance == null) {
    return hostInstance;
  }
  // TODO: the code is right but the types here are wrong.
  // https://github.com/facebook/react/pull/12863
  if ((hostInstance: any).canonical) {
    // Fabric
    return (hostInstance: any).canonical._nativeTag;
  }
  return hostInstance._nativeTag;
}

setBatchingImplementation(
  batchedUpdatesImpl,
  discreteUpdates,
  flushDiscreteUpdates,
  batchedEventUpdates,
);

const roots = new Map();

const ReactFabric: ReactFabricType = {
  NativeComponent: ReactNativeComponent(findNodeHandle, findHostInstance),

  // This is needed for implementation details of TouchableNativeFeedback
  // Remove this once TouchableNativeFeedback doesn't use cloneElement
  findHostInstance_DEPRECATED,
  findNodeHandle,

  dispatchCommand(handle: any, command: string, args: Array<any>) {
    const invalid =
      handle._nativeTag == null || handle._internalInstanceHandle == null;

    if (invalid) {
      if (__DEV__) {
        if (invalid) {
          console.error(
            "dispatchCommand was called with a ref that isn't a " +
              'native component. Use React.forwardRef to get access to the underlying native component',
          );
        }
      }
      return;
    }

    fabricDispatchCommand(
      handle._internalInstanceHandle.stateNode.node,
      command,
      args,
    );
  },

  render(element: React$Element<any>, containerTag: any, callback: ?Function) {
    let root = roots.get(containerTag);

    if (!root) {
      // TODO (bvaughn): If we decide to keep the wrapper component,
      // We could create a wrapper for containerTag as well to reduce special casing.
      root = createContainer(containerTag, LegacyRoot, false, null);
      roots.set(containerTag, root);
    }
    updateContainer(element, root, null, callback);

    return getPublicRootInstance(root);
  },

  unmountComponentAtNode(containerTag: number) {
    const root = roots.get(containerTag);
    if (root) {
      // TODO: Is it safe to reset this now or should I wait since this unmount could be deferred?
      updateContainer(null, root, null, () => {
        roots.delete(containerTag);
      });
    }
  },

  createPortal(
    children: ReactNodeList,
    containerTag: number,
    key: ?string = null,
  ) {
    return createPortal(children, containerTag, null, key);
  },

  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    // Used as a mixin in many createClass-based components
    NativeMethodsMixin: NativeMethodsMixin(findNodeHandle, findHostInstance),
  },
};

injectIntoDevTools({
  findFiberByHostInstance: getClosestInstanceFromNode,
  getInspectorDataForViewTag: getInspectorDataForViewTag,
  bundleType: __DEV__ ? 1 : 0,
  version: ReactVersion,
  rendererPackageName: 'react-native-renderer',
});

export default ReactFabric;
