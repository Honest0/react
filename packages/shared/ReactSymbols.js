/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types.
export const REACT_ELEMENT_TYPE = Symbol.for('react.element');
export const REACT_PORTAL_TYPE = Symbol.for('react.portal');
export const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
export const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
export const REACT_PROFILER_TYPE = Symbol.for('react.profiler');
export const REACT_PROVIDER_TYPE = Symbol.for('react.provider');
export const REACT_CONTEXT_TYPE = Symbol.for('react.context');
export const REACT_SERVER_CONTEXT_TYPE = Symbol.for('react.server_context');
export const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
export const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
export const REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
export const REACT_MEMO_TYPE = Symbol.for('react.memo');
export const REACT_LAZY_TYPE = Symbol.for('react.lazy');
export const REACT_SCOPE_TYPE = Symbol.for('react.scope');
export const REACT_DEBUG_TRACING_MODE_TYPE = Symbol.for(
  'react.debug_trace_mode',
);
export const REACT_OFFSCREEN_TYPE = Symbol.for('react.offscreen');
export const REACT_LEGACY_HIDDEN_TYPE = Symbol.for('react.legacy_hidden');
export const REACT_CACHE_TYPE = Symbol.for('react.cache');
export const REACT_TRACING_MARKER_TYPE = Symbol.for('react.tracing_marker');
export const REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED = Symbol.for(
  'react.default_value',
);

const MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export function getIteratorFn(maybeIterable: ?any): ?() => ?Iterator<*> {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
