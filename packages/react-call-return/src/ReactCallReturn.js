/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  REACT_CALL_TYPE,
  REACT_RETURN_TYPE,
  REACT_ELEMENT_TYPE,
} from 'shared/ReactSymbols';

import type {ReactCall, ReactNodeList, ReactReturn} from 'shared/ReactTypes';

type CallHandler<T, V> = (props: T, returns: Array<V>) => ReactNodeList;

export function unstable_createCall<T, V>(
  children: ReactNodeList,
  handler: CallHandler<T, V>,
  props: T,
  key: ?string = null,
): ReactCall<V> {
  const call = {
    // This tag allow us to uniquely identify this as a React Call
    $$typeof: REACT_ELEMENT_TYPE,
    type: REACT_CALL_TYPE,
    key: key == null ? null : '' + key,
    ref: null,
    props: {
      props,
      handler,
      children: children,
    },
  };

  if (__DEV__) {
    // TODO: Add _store property for marking this as validated.
    if (Object.freeze) {
      Object.freeze(call.props);
      Object.freeze(call);
    }
  }

  return call;
}

export function unstable_createReturn<V>(value: V): ReactReturn<V> {
  const returnNode = {
    // This tag allow us to uniquely identify this as a React Call
    $$typeof: REACT_ELEMENT_TYPE,
    type: REACT_RETURN_TYPE,
    key: null,
    ref: null,
    props: {
      value,
    },
  };

  if (__DEV__) {
    // TODO: Add _store property for marking this as validated.
    if (Object.freeze) {
      Object.freeze(returnNode);
    }
  }

  return returnNode;
}

/**
 * Verifies the object is a call object.
 */
export function unstable_isCall(object: mixed): boolean {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.type === REACT_CALL_TYPE
  );
}

/**
 * Verifies the object is a return object.
 */
export function unstable_isReturn(object: mixed): boolean {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.type === REACT_RETURN_TYPE
  );
}

export const unstable_REACT_RETURN_TYPE = REACT_RETURN_TYPE;
export const unstable_REACT_CALL_TYPE = REACT_CALL_TYPE;
