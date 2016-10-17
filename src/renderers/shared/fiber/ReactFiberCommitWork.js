/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberCommitWork
 * @flow
 */

'use strict';

import type { Fiber } from 'ReactFiber';
import type { FiberRoot } from 'ReactFiberRoot';
import type { HostConfig } from 'ReactFiberReconciler';

var ReactTypeOfWork = require('ReactTypeOfWork');
var {
  ClassComponent,
  HostContainer,
  HostComponent,
  HostText,
} = ReactTypeOfWork;
var { callCallbacks } = require('ReactFiberUpdateQueue');

var {
  Placement,
  PlacementAndUpdate,
} = require('ReactTypeOfSideEffect');

module.exports = function<T, P, I, TI, C>(config : HostConfig<T, P, I, TI, C>) {

  const updateContainer = config.updateContainer;
  const commitUpdate = config.commitUpdate;
  const commitTextUpdate = config.commitTextUpdate;

  const appendChild = config.appendChild;
  const insertBefore = config.insertBefore;
  const removeChild = config.removeChild;

  function getHostParent(fiber : Fiber) : ?I {
    let parent = fiber.return;
    while (parent) {
      switch (parent.tag) {
        case HostComponent:
          return parent.stateNode;
        case HostContainer:
          // TODO: Currently we use the updateContainer feature to update these,
          // but we should be able to handle this case too.
          return null;
      }
      parent = parent.return;
    }
    return null;
  }

  function getHostSibling(fiber : Fiber) : ?I {
    // We're going to search forward into the tree until we find a sibling host
    // node. Unfortunately, if multiple insertions are done in a row we have to
    // search past them. This leads to exponential search for the next sibling.
    // TODO: Find a more efficient way to do this.
    let node : Fiber = fiber;
    siblings: while (true) {
      // If we didn't find anything, let's try the next sibling.
      while (!node.sibling) {
        if (!node.return || node.return.tag === HostComponent) {
          // If we pop out of the root or hit the parent the fiber we are the
          // last sibling.
          return null;
        }
        node = node.return;
      }
      node = node.sibling;
      while (node.tag !== HostComponent && node.tag !== HostText) {
        // If it is not host node and, we might have a host node inside it.
        // Try to search down until we find one.
        // TODO: For coroutines, this will have to search the stateNode.
        if (node.effectTag === Placement ||
          node.effectTag === PlacementAndUpdate) {
          // If we don't have a child, try the siblings instead.
          continue siblings;
        }
        if (!node.child) {
          continue siblings;
        } else {
          node = node.child;
        }
      }
      // Check if this host node is stable or about to be placed.
      if (node.effectTag !== Placement &&
        node.effectTag !== PlacementAndUpdate) {
        // Found it!
        return node.stateNode;
      }
    }
  }

  function commitInsertion(finishedWork : Fiber) : void {
    // Recursively insert all host nodes into the parent.
    const parent = getHostParent(finishedWork);
    if (!parent) {
      return;
    }
    const before = getHostSibling(finishedWork);
    // We only have the top Fiber that was inserted but we need recurse down its
    // children to find all the terminal nodes.
    let node : Fiber = finishedWork;
    while (true) {
      if (node.tag === HostComponent || node.tag === HostText) {
        if (before) {
          insertBefore(parent, node.stateNode, before);
        } else {
          appendChild(parent, node.stateNode);
        }
      } else if (node.child) {
        // TODO: Coroutines need to visit the stateNode.
        node = node.child;
        continue;
      }
      if (node === finishedWork) {
        return;
      }
      while (!node.sibling) {
        if (!node.return || node.return === finishedWork) {
          return;
        }
        node = node.return;
      }
      node = node.sibling;
    }
  }

  function commitDeletion(current : Fiber) : void {
    // Recursively delete all host nodes from the parent.
    const parent = getHostParent(current);
    if (!parent) {
      return;
    }
    // We only have the top Fiber that was inserted but we need recurse down its
    // children to find all the terminal nodes.
    // TODO: Call componentWillUnmount on all classes as needed. Recurse down
    // removed HostComponents but don't call removeChild on already removed
    // children.
    let node : Fiber = current;
    while (true) {
      if (node.tag === HostComponent || node.tag === HostText) {
        removeChild(parent, node.stateNode);
      } else if (node.child) {
        // TODO: Coroutines need to visit the stateNode.
        node = node.child;
        continue;
      }
      if (node === current) {
        return;
      }
      while (!node.sibling) {
        if (!node.return || node.return === current) {
          return;
        }
        node = node.return;
      }
      node = node.sibling;
    }
  }

  function commitWork(current : ?Fiber, finishedWork : Fiber) : void {
    switch (finishedWork.tag) {
      case ClassComponent: {
        // Clear updates from current fiber. This must go before the callbacks
        // are reset, in case an update is triggered from inside a callback. Is
        // this safe? Relies on the assumption that work is only committed if
        // the update queue is empty.
        if (finishedWork.alternate) {
          finishedWork.alternate.updateQueue = null;
        }
        if (finishedWork.callbackList) {
          const { callbackList } = finishedWork;
          finishedWork.callbackList = null;
          callCallbacks(callbackList, finishedWork.stateNode);
        }
        // TODO: Fire componentDidMount/componentDidUpdate, update refs
        return;
      }
      case HostContainer: {
        // TODO: Attach children to root container.
        const children = finishedWork.output;
        const root : FiberRoot = finishedWork.stateNode;
        const containerInfo : C = root.containerInfo;
        updateContainer(containerInfo, children);
        return;
      }
      case HostComponent: {
        if (finishedWork.stateNode == null || !current) {
          throw new Error('This should only be done during updates.');
        }
        // Commit the work prepared earlier.
        const newProps = finishedWork.memoizedProps;
        const oldProps = current.memoizedProps;
        const instance : I = finishedWork.stateNode;
        commitUpdate(instance, oldProps, newProps);
        return;
      }
      case HostText: {
        if (finishedWork.stateNode == null || !current) {
          throw new Error('This should only be done during updates.');
        }
        const textInstance : TI = finishedWork.stateNode;
        const newText : string = finishedWork.memoizedProps;
        const oldText : string = current.memoizedProps;
        commitTextUpdate(textInstance, oldText, newText);
        return;
      }
      default:
        throw new Error('This unit of work tag should not have side-effects.');
    }
  }

  return {
    commitInsertion,
    commitDeletion,
    commitWork,
  };

};
