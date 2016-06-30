/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiber
 * @flow
 */

'use strict';

import type { ReactCoroutine, ReactYield } from 'ReactCoroutine';
import type { TypeOfWork } from 'ReactTypeOfWork';
import type { PriorityLevel } from 'ReactPriorityLevel';

var ReactTypeOfWork = require('ReactTypeOfWork');
var {
  IndeterminateComponent,
  ClassComponent,
  HostContainer,
  HostComponent,
  CoroutineComponent,
  YieldComponent,
} = ReactTypeOfWork;

var ReactElement = require('ReactElement');

var {
  NoWork,
} = require('ReactPriorityLevel');

// An Instance is shared between all versions of a component. We can easily
// break this out into a separate object to avoid copying so much to the
// alternate versions of the tree. We put this on a single object for now to
// minimize the number of objects created during the initial render.
type Instance = {

  // Tag identifying the type of fiber.
  tag: TypeOfWork,

  // Unique identifier of this child.
  key: null | string,

  // The function/class/module associated with this fiber.
  type: any,

  // The local state associated with this fiber.
  stateNode: ?Object,

  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.

};

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.
export type Fiber = Instance & {

  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: ?Fiber,

  // Singly Linked List Tree Structure.
  child: ?Fiber,
  sibling: ?Fiber,

  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  ref: null | (handle : ?Object) => void,

  // Input is the data coming into process this fiber. Arguments. Props.
  pendingProps: any, // This type will be more specific once we overload the tag.
  // TODO: I think that there is a way to merge pendingProps and memoizedProps.
  memoizedProps: any, // The props used to create the output.
  // Output is the return value of this fiber, or a linked list of return values
  // if this returns multiple values. Such as a fragment.
  output: any, // This type will be more specific once we overload the tag.

  // This will be used to quickly determine if a subtree has no pending changes.
  pendingWorkPriority: PriorityLevel,

  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: ?Fiber,

  // Keeps track if we've completed this node or if we're currently in the
  // middle of processing it. We really should know this based on pendingProps
  // or something else. We could also reuse the tag for this purpose. However,
  // I'm not really sure so I'll use a flag for now.
  // TODO: Find another way to infer this flag.
  hasWorkInProgress: bool,

  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.

};

var createFiber = function(tag : TypeOfWork, key : null | string) : Fiber {
  return {

    // Instance

    tag: tag,

    key: key,

    type: null,

    stateNode: null,

    // Fiber

    return: null,

    child: null,
    sibling: null,

    ref: null,

    pendingProps: null,
    memoizedProps: null,
    output: null,

    pendingWorkPriority: NoWork,

    hasWorkInProgress: false,

    alternate: null,

  };
};

function shouldConstruct(Component) {
  return !!(Component.prototype && Component.prototype.isReactComponent);
}

// This is used to create an alternate fiber to do work on.
exports.cloneFiber = function(fiber : Fiber, priorityLevel : PriorityLevel) : Fiber {
  // We use a double buffering pooling technique because we know that we'll only
  // ever need at most two versions of a tree. We pool the "other" unused node
  // that we're free to reuse. This is lazily created to avoid allocating extra
  // objects for things that are never updated. It also allow us to reclaim the
  // extra memory if needed.
  let alt = fiber.alternate;
  if (alt) {
    alt.stateNode = fiber.stateNode;
    alt.child = fiber.child;
    alt.sibling = fiber.sibling;
    alt.ref = alt.ref;
    alt.pendingProps = fiber.pendingProps;
    alt.pendingWorkPriority = priorityLevel;
    return alt;
  }

  // This should not have an alternate already
  alt = createFiber(fiber.tag, fiber.key);
  alt.type = fiber.type;
  alt.stateNode = fiber.stateNode;
  alt.child = fiber.child;
  alt.sibling = fiber.sibling;
  alt.ref = alt.ref;
  alt.pendingWorkPriority = priorityLevel;

  alt.alternate = fiber;
  fiber.alternate = alt;
  return alt;
};

exports.createHostContainerFiber = function() {
  const fiber = createFiber(HostContainer, null);
  return fiber;
};

exports.createFiberFromElement = function(element : ReactElement, priorityLevel : PriorityLevel) {
  const fiber = exports.createFiberFromElementType(element.type, element.key);
  fiber.pendingProps = element.props;
  fiber.pendingWorkPriority = priorityLevel;
  return fiber;
};

exports.createFiberFromElementType = function(type : mixed, key : null | string) {
  let fiber;
  if (typeof type === 'function') {
    fiber = shouldConstruct(type) ?
      createFiber(ClassComponent, key) :
      createFiber(IndeterminateComponent, key);
    fiber.type = type;
  } else if (typeof type === 'string') {
    fiber = createFiber(HostComponent, key);
    fiber.type = type;
  } else if (typeof type === 'object' && type !== null) {
    // Currently assumed to be a continuation and therefore is a fiber already.
    fiber = type;
  } else {
    throw new Error('Unknown component type: ' + typeof type);
  }
  return fiber;
};

exports.createFiberFromCoroutine = function(coroutine : ReactCoroutine, priorityLevel : PriorityLevel) {
  const fiber = createFiber(CoroutineComponent, coroutine.key);
  fiber.type = coroutine.handler;
  fiber.pendingProps = coroutine;
  fiber.pendingWorkPriority = priorityLevel;
  return fiber;
};

exports.createFiberFromYield = function(yieldNode : ReactYield, priorityLevel : PriorityLevel) {
  const fiber = createFiber(YieldComponent, yieldNode.key);
  fiber.pendingProps = {};
  return fiber;
};
