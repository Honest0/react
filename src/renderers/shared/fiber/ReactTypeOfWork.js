/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactTypeOfWork
 * @flow
 */

'use strict';

export type TypeOfWork = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

module.exports = {
  IndeterminateComponent: 0, // Before we know whether it is functional or class
  FunctionalComponent: 1,
  ClassComponent: 2,
  HostContainer: 3, // Root of a host tree. Could be nested inside another node.
  HostComponent: 4,
  HostText: 5,
  CoroutineComponent: 6,
  CoroutineHandlerPhase: 7,
  YieldComponent: 8,
  Fragment: 9,
  Portal: 10, // A subtree. Could be an entry point to a different renderer.
};
