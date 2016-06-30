/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberBeginWork
 * @flow
 */

'use strict';

import type { ReactCoroutine } from 'ReactCoroutine';
import type { Fiber } from 'ReactFiber';

var ReactChildFiber = require('ReactChildFiber');
var ReactTypeOfWork = require('ReactTypeOfWork');
var {
  IndeterminateComponent,
  FunctionalComponent,
  ClassComponent,
  HostContainer,
  HostComponent,
  CoroutineComponent,
  CoroutineHandlerPhase,
  YieldComponent,
} = ReactTypeOfWork;
var {
  NoWork,
  OffscreenPriority,
} = require('ReactPriorityLevel');

function reconcileChildren(current, workInProgress, nextChildren) {
  const priority = workInProgress.pendingWorkPriority;
  workInProgress.child = ReactChildFiber.reconcileChildFibers(
    workInProgress,
    current ? current.child : null,
    nextChildren,
    priority
  );
}

function updateFunctionalComponent(current, workInProgress) {
  var fn = workInProgress.type;
  var props = workInProgress.pendingProps;
  console.log('update fn:', fn.name);
  var nextChildren = fn(props);
  reconcileChildren(current, workInProgress, nextChildren);
  workInProgress.pendingWorkPriority = NoWork;
}

function updateHostComponent(current, workInProgress) {
  console.log('host component', workInProgress.type, typeof workInProgress.pendingProps.children === 'string' ? workInProgress.pendingProps.children : '');

  var nextChildren = workInProgress.pendingProps.children;

  let priority = workInProgress.pendingWorkPriority;
  if (workInProgress.pendingProps.hidden && priority !== OffscreenPriority) {
    // If this host component is hidden, we can reconcile its children at
    // the lowest priority and bail out from this particular pass. Unless, we're
    // currently reconciling the lowest priority.
    workInProgress.child = ReactChildFiber.reconcileChildFibers(
      workInProgress,
      current ? current.child : null,
      nextChildren,
      OffscreenPriority
    );
    workInProgress.pendingWorkPriority = OffscreenPriority;
    return null;
  } else {
    workInProgress.child = ReactChildFiber.reconcileChildFibers(
      workInProgress,
      current ? current.child : null,
      nextChildren,
      priority
    );
    workInProgress.pendingWorkPriority = NoWork;
    return workInProgress.child;
  }
}

function mountIndeterminateComponent(current, workInProgress) {
  var fn = workInProgress.type;
  var props = workInProgress.pendingProps;
  var value = fn(props);
  if (typeof value === 'object' && value && typeof value.render === 'function') {
    console.log('performed work on class:', fn.name);
    // Proceed under the assumption that this is a class instance
    workInProgress.tag = ClassComponent;
    if (workInProgress.alternate) {
      workInProgress.alternate.tag = ClassComponent;
    }
  } else {
    console.log('performed work on fn:', fn.name);
    // Proceed under the assumption that this is a functional component
    workInProgress.tag = FunctionalComponent;
    if (workInProgress.alternate) {
      workInProgress.alternate.tag = FunctionalComponent;
    }
  }
  reconcileChildren(current, workInProgress, value);
  workInProgress.pendingWorkPriority = NoWork;
}

function updateCoroutineComponent(current, workInProgress) {
  var coroutine = (workInProgress.pendingProps : ?ReactCoroutine);
  if (!coroutine) {
    throw new Error('Should be resolved by now');
  }
  console.log('begin coroutine', workInProgress.type.name);
  reconcileChildren(current, workInProgress, coroutine.children);
  workInProgress.pendingWorkPriority = NoWork;
}

function beginWork(current : ?Fiber, workInProgress : Fiber) : ?Fiber {
  // The current, flushed, state of this fiber is the alternate.
  // Ideally nothing should rely on this, but relying on it here
  // means that we don't need an additional field on the work in
  // progress.
  if (current && workInProgress.pendingProps === current.memoizedProps) {
    // The most likely scenario is that the previous copy of the tree contains
    // the same props as the new one. In that case, we can just copy the output
    // and children from that node.
    workInProgress.output = current.output;
    workInProgress.child = current.child;
    if (workInProgress.child) {
      workInProgress.child.parent = workInProgress;
    }
    workInProgress.stateNode = current.stateNode;
    workInProgress.pendingWorkPriority = NoWork;
    return null;
  }
  if (workInProgress.pendingProps === workInProgress.memoizedProps) {
    // In a ping-pong scenario, this version could actually contain the
    // old props. In that case, we can just bail out.
    return null;
  }
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      mountIndeterminateComponent(current, workInProgress);
      return workInProgress.child;
    case FunctionalComponent:
      updateFunctionalComponent(current, workInProgress);
      return workInProgress.child;
    case ClassComponent:
      console.log('class component', workInProgress.pendingProps.type.name);
      return workInProgress.child;
    case HostContainer:
      reconcileChildren(current, workInProgress, workInProgress.pendingProps);
      // A yield component is just a placeholder, we can just run through the
      // next one immediately.
      workInProgress.pendingWorkPriority = NoWork;
      if (workInProgress.child) {
        return beginWork(
          workInProgress.child.alternate,
          workInProgress.child
        );
      }
      return null;
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case CoroutineHandlerPhase:
      // This is a restart. Reset the tag to the initial phase.
      workInProgress.tag = CoroutineComponent;
      // Intentionally fall through since this is now the same.
    case CoroutineComponent:
      updateCoroutineComponent(current, workInProgress);
      // This doesn't take arbitrary time so we could synchronously just begin
      // eagerly do the work of workInProgress.child as an optimization.
      if (workInProgress.child) {
        return beginWork(
          workInProgress.child.alternate,
          workInProgress.child
        );
      }
      return workInProgress.child;
    case YieldComponent:
      // A yield component is just a placeholder, we can just run through the
      // next one immediately.
      workInProgress.pendingWorkPriority = NoWork;
      if (workInProgress.sibling) {
        return beginWork(
          workInProgress.sibling.alternate,
          workInProgress.sibling
        );
      }
      return null;
    default:
      throw new Error('Unknown unit of work tag');
  }
}

exports.beginWork = beginWork;
