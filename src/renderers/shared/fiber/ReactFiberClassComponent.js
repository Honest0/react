/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberClassComponent
 * @flow
 */

'use strict';

import type { Fiber } from 'ReactFiber';
import type { UpdateQueue } from 'ReactFiberUpdateQueue';

var {
  createUpdateQueue,
  addToQueue,
  addCallbackToQueue,
  mergeUpdateQueue,
} = require('ReactFiberUpdateQueue');
var { isMounted } = require('ReactFiberTreeReflection');
var ReactInstanceMap = require('ReactInstanceMap');
var shallowEqual = require('shallowEqual');
var warning = require('warning');
var invariant = require('invariant');


const isArray = Array.isArray;

module.exports = function(scheduleUpdate : (fiber: Fiber) => void) {

  function scheduleUpdateQueue(fiber: Fiber, updateQueue: UpdateQueue) {
    fiber.updateQueue = updateQueue;
    // Schedule update on the alternate as well, since we don't know which tree
    // is current.
    if (fiber.alternate) {
      fiber.alternate.updateQueue = updateQueue;
    }
    scheduleUpdate(fiber);
  }

  // Class component state updater
  const updater = {
    isMounted,
    enqueueSetState(instance, partialState) {
      const fiber = ReactInstanceMap.get(instance);
      const updateQueue = fiber.updateQueue ?
        addToQueue(fiber.updateQueue, partialState) :
        createUpdateQueue(partialState);
      scheduleUpdateQueue(fiber, updateQueue);
    },
    enqueueReplaceState(instance, state) {
      const fiber = ReactInstanceMap.get(instance);
      const updateQueue = createUpdateQueue(state);
      updateQueue.isReplace = true;
      scheduleUpdateQueue(fiber, updateQueue);
    },
    enqueueForceUpdate(instance) {
      const fiber = ReactInstanceMap.get(instance);
      const updateQueue = fiber.updateQueue || createUpdateQueue(null);
      updateQueue.isForced = true;
      scheduleUpdateQueue(fiber, updateQueue);
    },
    enqueueCallback(instance, callback) {
      const fiber = ReactInstanceMap.get(instance);
      let updateQueue = fiber.updateQueue ?
        fiber.updateQueue :
        createUpdateQueue(null);
      addCallbackToQueue(updateQueue, callback);
      scheduleUpdateQueue(fiber, updateQueue);
    },
  };

  function checkShouldComponentUpdate(workInProgress, oldProps, newProps, newState) {
    const updateQueue = workInProgress.updateQueue;
    if (oldProps === null || (updateQueue && updateQueue.isForced)) {
      return true;
    }

    const instance = workInProgress.stateNode;
    if (typeof instance.shouldComponentUpdate === 'function') {
      const shouldUpdate = instance.shouldComponentUpdate(newProps, newState);

      if (__DEV__) {
        warning(
          shouldUpdate !== undefined,
          '%s.shouldComponentUpdate(): Returned undefined instead of a ' +
          'boolean value. Make sure to return true or false.',
          getName(workInProgress, instance)
        );
      }

      return shouldUpdate;
    }

    const type = workInProgress.type;
    if (type.prototype && type.prototype.isPureReactComponent) {
      return (
        !shallowEqual(oldProps, newProps) ||
        !shallowEqual(instance.state, newState)
      );
    }

    return true;
  }

  function getName(workInProgress: Fiber, inst: any): string {
    const type = workInProgress.type;
    const constructor = inst && inst.constructor;
    return (
      type.displayName || (constructor && constructor.displayName) ||
      type.name || (constructor && constructor.name) ||
      'A Component'
    );
  }

  function checkClassInstance(workInProgress: Fiber, inst: any) {
    if (__DEV__) {
      const name = getName(workInProgress, inst);
      const renderPresent = inst.render;
      warning(
        renderPresent,
        '%s(...): No `render` method found on the returned component ' +
        'instance: you may have forgotten to define `render`.',
        name
      );
      const noGetInitialStateOnES6 = (
        !inst.getInitialState ||
        inst.getInitialState.isReactClassApproved
      );
      warning(
        noGetInitialStateOnES6,
        'getInitialState was defined on %s, a plain JavaScript class. ' +
        'This is only supported for classes created using React.createClass. ' +
        'Did you mean to define a state property instead?',
        name
      );
      const noGetDefaultPropsOnES6 = (
        !inst.getDefaultProps ||
        inst.getDefaultProps.isReactClassApproved
      );
      warning(
        noGetDefaultPropsOnES6,
        'getDefaultProps was defined on %s, a plain JavaScript class. ' +
        'This is only supported for classes created using React.createClass. ' +
        'Use a static property to define defaultProps instead.',
        name
      );
      const noInstancePropTypes = !inst.propTypes;
      warning(
        noInstancePropTypes,
        'propTypes was defined as an instance property on %s. Use a static ' +
        'property to define propTypes instead.',
        name,
      );
      const noInstanceContextTypes = !inst.contextTypes;
      warning(
        noInstanceContextTypes,
        'contextTypes was defined as an instance property on %s. Use a static ' +
        'property to define contextTypes instead.',
        name,
      );
      const noComponentShouldUpdate = typeof inst.componentShouldUpdate !== 'function';
      warning(
        noComponentShouldUpdate,
        '%s has a method called ' +
        'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' +
        'The name is phrased as a question because the function is ' +
        'expected to return a value.',
        name
      );
      const noComponentDidUnmount = typeof inst.componentDidUnmount !== 'function';
      warning(
        noComponentDidUnmount,
        '%s has a method called ' +
        'componentDidUnmount(). But there is no such lifecycle method. ' +
        'Did you mean componentWillUnmount()?',
        name
      );
      const noComponentWillRecieveProps = typeof inst.componentWillRecieveProps !== 'function';
      warning(
        noComponentWillRecieveProps,
        '%s has a method called ' +
        'componentWillRecieveProps(). Did you mean componentWillReceiveProps()?',
        name
      );
    }

    const instanceState = inst.state;
    if (instanceState && (typeof instanceState !== 'object' || isArray(instanceState))) {
      invariant(
        false,
        '%s.state: must be set to an object or null',
        getName(workInProgress, inst)
      );
    }
  }

  function adoptClassInstance(workInProgress : Fiber, instance : any) : void {
    instance.updater = updater;
    workInProgress.stateNode = instance;
    // The instance needs access to the fiber so that it can schedule updates
    ReactInstanceMap.set(instance, workInProgress);
  }

  function constructClassInstance(workInProgress : Fiber) : any {
    const ctor = workInProgress.type;
    const props = workInProgress.pendingProps;
    const instance = new ctor(props);
    checkClassInstance(workInProgress, instance);
    adoptClassInstance(workInProgress, instance);
    return instance;
  }

  // Invokes the mount life-cycles on a previously never rendered instance.
  function mountClassInstance(workInProgress : Fiber) : void {
    const instance = workInProgress.stateNode;

    const state = instance.state || null;

    let props = workInProgress.pendingProps;
    if (!props) {
      throw new Error('There must be pending props for an initial mount.');
    }

    instance.props = props;
    instance.state = state;

    if (typeof instance.componentWillMount === 'function') {
      instance.componentWillMount();
      // If we had additional state updates during this life-cycle, let's
      // process them now.
      const updateQueue = workInProgress.updateQueue;
      if (updateQueue) {
        instance.state = mergeUpdateQueue(updateQueue, instance, state, props);
      }
    }
  }

  // Called on a preexisting class instance. Returns false if a resumed render
  // could be reused.
  function resumeMountClassInstance(workInProgress : Fiber) : boolean {
    let newState = workInProgress.memoizedState;
    let newProps = workInProgress.pendingProps;
    if (!newProps) {
      // If there isn't any new props, then we'll reuse the memoized props.
      // This could be from already completed work.
      newProps = workInProgress.memoizedProps;
      if (!newProps) {
        throw new Error('There should always be pending or memoized props.');
      }
    }

    // TODO: Should we deal with a setState that happened after the last
    // componentWillMount and before this componentWillMount? Probably
    // unsupported anyway.

    if (!checkShouldComponentUpdate(
      workInProgress,
      workInProgress.memoizedProps,
      newProps,
      newState
    )) {
      return false;
    }

    // If we didn't bail out we need to construct a new instance. We don't
    // want to reuse one that failed to fully mount.
    const newInstance = constructClassInstance(workInProgress);
    newInstance.props = newProps;
    newInstance.state = newState = newInstance.state || null;

    if (typeof newInstance.componentWillMount === 'function') {
      newInstance.componentWillMount();
    }
    // If we had additional state updates, process them now.
    // They may be from componentWillMount() or from error boundary's setState()
    // during initial mounting.
    const newUpdateQueue = workInProgress.updateQueue;
    if (newUpdateQueue) {
      newInstance.state = mergeUpdateQueue(newUpdateQueue, newInstance, newState, newProps);
    }
    return true;
  }

  // Invokes the update life-cycles and returns false if it shouldn't rerender.
  function updateClassInstance(current : Fiber, workInProgress : Fiber) : boolean {
    const instance = workInProgress.stateNode;

    const oldProps = workInProgress.memoizedProps || current.memoizedProps;
    let newProps = workInProgress.pendingProps;
    if (!newProps) {
      // If there aren't any new props, then we'll reuse the memoized props.
      // This could be from already completed work.
      newProps = oldProps;
      if (!newProps) {
        throw new Error('There should always be pending or memoized props.');
      }
    }

    // Note: During these life-cycles, instance.props/instance.state are what
    // ever the previously attempted to render - not the "current". However,
    // during componentDidUpdate we pass the "current" props.

    if (oldProps !== newProps) {
      if (typeof instance.componentWillReceiveProps === 'function') {
        instance.componentWillReceiveProps(newProps);
      }
    }

    // Compute the next state using the memoized state and the update queue.
    const updateQueue = workInProgress.updateQueue;
    const previousState = workInProgress.memoizedState;
    // TODO: Previous state can be null.
    let newState;
    if (updateQueue) {
      if (!updateQueue.hasUpdate) {
        newState = previousState;
      } else {
        newState = mergeUpdateQueue(updateQueue, instance, previousState, newProps);
      }
    } else {
      newState = previousState;
    }

    if (oldProps === newProps &&
        previousState === newState &&
        updateQueue && !updateQueue.isForced) {
      return false;
    }

    if (!checkShouldComponentUpdate(
      workInProgress,
      oldProps,
      newProps,
      newState
    )) {
      // TODO: Should this get the new props/state updated regardless?
      return false;
    }

    if (typeof instance.componentWillUpdate === 'function') {
      instance.componentWillUpdate(newProps, newState);
    }

    instance.props = newProps;
    instance.state = newState;
    return true;
  }

  return {
    adoptClassInstance,
    constructClassInstance,
    mountClassInstance,
    resumeMountClassInstance,
    updateClassInstance,
  };

};
