/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule ReactUpdates
 */

"use strict";

var ReactPerf = require('ReactPerf');

var invariant = require('invariant');

var dirtyComponents = [];

var batchingStrategy = null;

function ensureInjected() {
  invariant(
    ReactUpdates.ReactReconcileTransaction && batchingStrategy,
    'ReactUpdates: must inject a reconcile transaction class and batching ' +
    'strategy'
  );
}

function batchedUpdates(callback, param) {
  ensureInjected();
  batchingStrategy.batchedUpdates(callback, param);
}

/**
 * Array comparator for ReactComponents by owner depth
 *
 * @param {ReactComponent} c1 first component you're comparing
 * @param {ReactComponent} c2 second component you're comparing
 * @return {number} Return value usable by Array.prototype.sort().
 */
function mountDepthComparator(c1, c2) {
  return c1._mountDepth - c2._mountDepth;
}

function runBatchedUpdates(transaction) {
  // Since reconciling a component higher in the owner hierarchy usually (not
  // always -- see shouldComponentUpdate()) will reconcile children, reconcile
  // them before their children by sorting the array.

  dirtyComponents.sort(mountDepthComparator);

  for (var i = 0; i < dirtyComponents.length; i++) {
    // If a component is unmounted before pending changes apply, ignore them
    // TODO: Queue unmounts in the same list to avoid this happening at all
    var component = dirtyComponents[i];
    if (component.isMounted()) {
      // If performUpdateIfNecessary happens to enqueue any new updates, we
      // shouldn't execute the callbacks until the next render happens, so
      // stash the callbacks first
      var callbacks = component._pendingCallbacks;
      component._pendingCallbacks = null;
      component.performUpdateIfNecessary(transaction);

      if (callbacks) {
        for (var j = 0; j < callbacks.length; j++) {
          transaction.getReactMountReady().enqueue(
            callbacks[j],
            component
          );
        }
      }
    }
  }
}

function clearDirtyComponents() {
  dirtyComponents.length = 0;
}

function flushBatchedUpdatesOnce(transaction) {
  // Run these in separate functions so the JIT can optimize
  try {
    runBatchedUpdates(transaction);
  } finally {
    clearDirtyComponents();
  }
}

var flushBatchedUpdates = ReactPerf.measure(
  'ReactUpdates',
  'flushBatchedUpdates',
  function() {
    // flushBatchedUpdatesOnce will clear the dirtyComponents array, but
    // mount-ready handlers (i.e., componentDidMount/Update) may enqueue more
    // state updates which we should apply immediately
    while (dirtyComponents.length) {
      var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
      transaction.perform(flushBatchedUpdatesOnce, null, transaction);
      ReactUpdates.ReactReconcileTransaction.release(transaction);
    }
  }
);

/**
 * Mark a component as needing a rerender, adding an optional callback to a
 * list of functions which will be executed once the rerender occurs.
 */
function enqueueUpdate(component, callback) {
  invariant(
    !callback || typeof callback === "function",
    'enqueueUpdate(...): You called `setProps`, `replaceProps`, ' +
    '`setState`, `replaceState`, or `forceUpdate` with a callback that ' +
    'isn\'t callable.'
  );
  ensureInjected();

  if (!batchingStrategy.isBatchingUpdates) {
    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      component.performUpdateIfNecessary,
      component,
      transaction
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);
    callback && callback.call(component);
    return;
  }

  dirtyComponents.push(component);

  if (callback) {
    if (component._pendingCallbacks) {
      component._pendingCallbacks.push(callback);
    } else {
      component._pendingCallbacks = [callback];
    }
  }
}

var ReactUpdatesInjection = {
  injectReconcileTransaction: function(ReconcileTransaction) {
    invariant(
      ReconcileTransaction,
      'ReactUpdates: must provide a reconcile transaction class'
    );
    ReactUpdates.ReactReconcileTransaction = ReconcileTransaction;
  },

  injectBatchingStrategy: function(_batchingStrategy) {
    invariant(
      _batchingStrategy,
      'ReactUpdates: must provide a batching strategy'
    );
    invariant(
      typeof _batchingStrategy.batchedUpdates === 'function',
      'ReactUpdates: must provide a batchedUpdates() function'
    );
    invariant(
      typeof _batchingStrategy.isBatchingUpdates === 'boolean',
      'ReactUpdates: must provide an isBatchingUpdates boolean attribute'
    );
    batchingStrategy = _batchingStrategy;
  }
};

var ReactUpdates = {
  /**
   * React references `ReactReconcileTransaction` using this property in order
   * to allow dependency injection.
   *
   * @internal
   */
  ReactReconcileTransaction: null,

  batchedUpdates: batchedUpdates,
  enqueueUpdate: enqueueUpdate,
  flushBatchedUpdates: flushBatchedUpdates,
  injection: ReactUpdatesInjection
};

module.exports = ReactUpdates;
