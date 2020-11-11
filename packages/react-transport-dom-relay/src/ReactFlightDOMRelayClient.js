/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {RowEncoding} from './ReactFlightDOMRelayProtocol';

import type {Response} from 'react-client/src/ReactFlightClient';

import {
  createResponse,
  resolveModel,
  resolveModule,
  resolveError,
  close,
} from 'react-client/src/ReactFlightClient';

export {createResponse, close};

export function resolveRow(response: Response, chunk: RowEncoding): void {
  if (chunk[0] === 'J') {
    resolveModel(response, chunk[1], chunk[2]);
  } else if (chunk[0] === 'M') {
    resolveModule(response, chunk[1], chunk[2]);
  } else {
    // $FlowFixMe: Flow doesn't support disjoint unions on tuples.
    resolveError(response, chunk[1], chunk[2].message, chunk[2].stack);
  }
}
