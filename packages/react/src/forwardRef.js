/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {REACT_FORWARD_REF_TYPE, REACT_MEMO_TYPE} from 'shared/ReactSymbols';

import warning from 'shared/warning';

export default function forwardRef<Props, ElementType: React$ElementType>(
  render: (props: Props, ref: React$Ref<ElementType>) => React$Node,
) {
  if (__DEV__) {
    if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
      warning(
        'forwardRef requires a render function but received a `memo` ' +
          'component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...)).',
      );
    } else if (typeof render !== 'function') {
      warning(
        'forwardRef requires a render function but was given %s.',
        render === null ? 'null' : typeof render,
      );
    } else {
      if (render.length !== 0 && render.length !== 2) {
        warning(
          'forwardRef render functions accept exactly two parameters: props and ref. %s',
          render.length === 1
            ? 'Did you forget to use the ref parameter?'
            : 'Any additional parameter will be undefined.',
        );
      }
    }

    if (render != null) {
      if (render.defaultProps != null || render.propTypes != null) {
        warning(
          'forwardRef render functions do not support propTypes or defaultProps. ' +
            'Did you accidentally pass a React component?',
        );
      }
    }
  }

  return {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  };
}
