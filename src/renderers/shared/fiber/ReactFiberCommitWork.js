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
} = ReactTypeOfWork;

module.exports = function<T, P, I, C>(config : HostConfig<T, P, I, C>) {

  const updateContainer = config.updateContainer;
  const commitUpdate = config.commitUpdate;

  function commitWork(finishedWork : Fiber) : void {
    switch (finishedWork.tag) {
      case ClassComponent: {
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
        if (finishedWork.stateNode == null || !finishedWork.alternate) {
          throw new Error('This should only be done during updates.');
        }
        // Commit the work prepared earlier.
        let child;
        if (finishedWork.wasDeprioritized) {
          // If this was a down priority, we need to preserve the old child in
          // the output.
          child = finishedWork.alternate ? finishedWork.alternate.child : null;
        } else {
          child = finishedWork.child;
        }
        const children = (child && !child.sibling) ? (child.output : ?Fiber | I) : child;
        const newProps = finishedWork.memoizedProps;
        const current = finishedWork.alternate;
        const oldProps = current.memoizedProps;
        const instance : I = finishedWork.stateNode;
        commitUpdate(instance, oldProps, newProps, children);
        return;
      }
      default:
        throw new Error('This unit of work tag should not have side-effects.');
    }
  }

  return {
    commitWork,
  };

};
