/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactGenericBatching
 */

'use strict';

var ReactControlledComponent = require('ReactControlledComponent');

// Used as a way to call batchedUpdates when we don't know if we're in a Fiber
// or Stack context. Such as when we're dispatching events or if third party
// libraries need to call batchedUpdates. Eventually, this API will go away when
// everything is batched by default. We'll then have a similar API to opt-out of
// scheduled work and instead do synchronous work.

// Defaults
var stackBatchedUpdates = function(fn, a, b, c, d, e) {
  fn(a, b, c, d, e);
};
var fiberPerformSynchronousWork = function(fn, bookkeeping) {
  fn(bookkeeping);
};

function performFiberBatchedUpdates(fn, bookkeeping) {
  // If we have Fiber loaded, we need to wrap this in a batching call so that
  // Fiber can apply its default priority for this call.
  fiberPerformSynchronousWork(fn, bookkeeping);
}
function batchedUpdates(fn, bookkeeping) {
  // We first perform work with the stack batching strategy, by passing our
  // indirection to it.
  stackBatchedUpdates(performFiberBatchedUpdates, fn, bookkeeping);
}

var isBatching = false;
function batchedUpdatesWithControlledTarget(fn, bookkeeping, target) {
  if (isBatching) {
    // TODO: If this target is not the same as the one currently batched,
    // we'll drop it.
    batchedUpdates(fn, bookkeeping);
    return;
  }
  isBatching = true;
  try {
    batchedUpdates(fn, bookkeeping);
  } finally {
    isBatching = false;
  }
  if (target) {
    // Here we wait until all updates have propagated, which is important
    // when using controlled components within layers:
    // https://github.com/facebook/react/issues/1698
    // Then we restore state of any controlled component.
    ReactControlledComponent.restoreStateIfNeeded(target);
  }
}

var ReactGenericBatchingInjection = {
  injectStackBatchedUpdates: function(_batchedUpdates) {
    stackBatchedUpdates = _batchedUpdates;
  },
  injectFiberPerformSynchronousWork: function(_performSynchronousWork) {
    fiberPerformSynchronousWork = _performSynchronousWork;
  },
};

var ReactGenericBatching = {
  batchedUpdates,
  batchedUpdatesWithControlledTarget,
  injection: ReactGenericBatchingInjection,
};

module.exports = ReactGenericBatching;
