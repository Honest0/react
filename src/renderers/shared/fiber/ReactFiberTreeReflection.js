/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactFiberTreeReflection
 * @flow
 */

'use strict';

import type { Fiber } from 'ReactFiber';

var ReactInstanceMap = require('ReactInstanceMap');

var {
  ClassComponent,
  HostContainer,
  HostComponent,
  HostText,
} = require('ReactTypeOfWork');

exports.findCurrentHostFiber = function(component : ReactComponent<any, any, any>) : Fiber | null {
  var parent : ?Fiber = ReactInstanceMap.get(component);
  if (!parent) {
    return null;
  }

  // TODO: This search is incomplete because this could be one of two possible fibers.
  let node : Fiber = parent;
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      return node;
    } else if (node.child) {
      // TODO: Coroutines need to visit the stateNode.
      node = node.child;
      continue;
    }
    if (node === parent) {
      return null;
    }
    while (!node.sibling) {
      if (!node.return || node.return === parent) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
  }
  return null;
};
