/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {LazyComponent} from 'shared/ReactLazyComponent';

import {Resolved, Rejected, Pending} from 'shared/ReactLazyComponent';
import warning from 'shared/warning';

export function readLazyComponentType<T>(lazyComponent: LazyComponent<T>): T {
  const status = lazyComponent._status;
  switch (status) {
    case Resolved:
      const Component: T = lazyComponent._result;
      return Component;
    case Rejected:
      throw lazyComponent._result;
    case Pending:
      throw lazyComponent;
    default: {
      lazyComponent._status = Pending;
      const ctor = lazyComponent._ctor;
      const thenable = ctor();
      thenable.then(
        moduleObject => {
          if (lazyComponent._status === Pending) {
            const defaultExport = moduleObject.default;
            if (__DEV__) {
              if (defaultExport === undefined) {
                warning(
                  false,
                  'lazy: Expected the result of a dynamic import() call. ' +
                    'Instead received: %s\n\nYour code should look like: \n  ' +
                    "const MyComponent = lazy(() => import('./MyComponent'))",
                  moduleObject,
                );
              }
            }
            lazyComponent._status = Resolved;
            lazyComponent._result = defaultExport;
          }
        },
        error => {
          if (lazyComponent._status === Pending) {
            lazyComponent._status = Rejected;
            lazyComponent._result = error;
          }
        },
      );
      throw thenable;
    }
  }
}
