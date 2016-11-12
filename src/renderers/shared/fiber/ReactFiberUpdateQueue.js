/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberUpdateQueue
 * @flow
 */

'use strict';

type UpdateQueueNode = {
  partialState: any,
  callback: ?Function,
  callbackWasCalled: boolean,
  isReplace: boolean,
  next: ?UpdateQueueNode,
};

export type UpdateQueue = UpdateQueueNode & {
  isForced: boolean,
  hasUpdate: boolean,
  hasCallback: boolean,
  tail: UpdateQueueNode
};

exports.createUpdateQueue = function(partialState : mixed) : UpdateQueue {
  const queue = {
    partialState,
    callback: null,
    callbackWasCalled: false,
    isReplace: false,
    next: null,
    isForced: false,
    hasUpdate: partialState != null,
    hasCallback: false,
    tail: (null : any),
  };
  queue.tail = queue;
  return queue;
};

function addToQueue(queue : UpdateQueue, partialState : mixed) : UpdateQueue {
  const node = {
    partialState,
    callback: null,
    callbackWasCalled: false,
    isReplace: false,
    next: null,
  };
  queue.tail.next = node;
  queue.tail = node;
  queue.hasUpdate = queue.hasUpdate || (partialState != null);
  return queue;
}

exports.addToQueue = addToQueue;

exports.addCallbackToQueue = function(queue : UpdateQueue, callback: Function) : UpdateQueue {
  if (queue.tail.callback) {
    // If the tail already as a callback, add an empty node to queue
    addToQueue(queue, null);
  }
  queue.tail.callback = callback;
  queue.hasCallback = true;
  return queue;
};

exports.callCallbacks = function(queue : UpdateQueue, context : any) : Error | null {
  let node : ?UpdateQueueNode = queue;
  let error = null;
  while (node) {
    const callback = node.callback;
    if (callback && !node.callbackWasCalled) {
      try {
        node.callbackWasCalled = true;
        if (typeof context !== 'undefined') {
          callback.call(context);
        } else {
          callback();
        }
      } catch (e) {
        error = e;
      }
    }
    node = node.next;
  }
  return error;
};

exports.mergeUpdateQueue = function(queue : UpdateQueue, instance : any, prevState : any, props : any) : any {
  let node : ?UpdateQueueNode = queue;
  let state = Object.assign({}, prevState);
  while (node) {
    state = node.isReplace ? null : state;
    let partialState;
    if (typeof node.partialState === 'function') {
      const updateFn = node.partialState;
      partialState = updateFn.call(instance, state, props);
    } else {
      partialState = node.partialState;
    }
    state = Object.assign(state || {}, partialState);
    node = node.next;
  }
  return state;
};
