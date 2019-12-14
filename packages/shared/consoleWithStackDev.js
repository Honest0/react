/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactSharedInternals from 'shared/ReactSharedInternals';

// In DEV, calls to console.warn and console.error get replaced
// by calls to these methods by a Babel plugin.
//
// In PROD (or in packages without access to React internals),
// they are left as they are instead.

export function warn(format, ...args) {
  if (__DEV__) {
    printWarning('warn', format, args);
  }
}

export function error(format, ...args) {
  if (__DEV__) {
    printWarning('error', format, args);
  }
}

function printWarning(level, format, args) {
  if (__DEV__) {
    const hasExistingStack =
      args.length > 0 &&
      typeof args[args.length - 1] === 'string' &&
      args[args.length - 1].indexOf('\n    in') === 0;

    if (!hasExistingStack) {
      const ReactDebugCurrentFrame =
        ReactSharedInternals.ReactDebugCurrentFrame;
      const stack = ReactDebugCurrentFrame.getStackAddendum();
      if (stack !== '') {
        format += '%s';
        args = args.concat([stack]);
      }
    }

    const argsWithFormat = args.map(item => '' + item);
    // Careful: RN currently depends on this prefix
    argsWithFormat.unshift('Warning: ' + format);
    // We intentionally don't use spread (or .apply) directly because it
    // breaks IE9: https://github.com/facebook/react/issues/13610
    // eslint-disable-next-line react-internal/no-production-logging
    Function.prototype.apply.call(console[level], console, argsWithFormat);

    try {
      // --- Welcome to debugging React ---
      // This error was thrown as a convenience so that you can use this stack
      // to find the callsite that caused this warning to fire.
      let argIndex = 0;
      const message =
        'Warning: ' + format.replace(/%s/g, () => args[argIndex++]);
      throw new Error(message);
    } catch (x) {}
  }
}
