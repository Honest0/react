/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {isEnabled} from './src/events/ReactDOMEventListener';

import {__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED} from './src/client/ReactDOM';

// For classic WWW builds, include a few internals that are already in use.
Object.assign((__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: any), {
  ReactBrowserEventEmitter: {
    isEnabled,
  },
});

export {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  createPortal,
  createRoot,
  createRoot as unstable_createRoot, // TODO Remove once callsites use createRoot
  findDOMNode,
  flushSync,
  hydrate,
  render,
  unmountComponentAtNode,
  unstable_batchedUpdates,
  unstable_createEventHandle,
  unstable_flushControlled,
  unstable_isNewReconciler,
  unstable_renderSubtreeIntoContainer,
  unstable_runWithPriority, // DO NOT USE: Temporarily exposed to migrate off of Scheduler.runWithPriority.
  unstable_scheduleHydration,
  version,
} from './src/client/ReactDOM';
