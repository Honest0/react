/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {JSONValue, ResponseBase} from 'react-client/src/ReactFlightClient';

import type JSResourceReference from 'JSResourceReference';

export type ModuleReference<T> = JSResourceReference<T>;

import {
  parseModelString,
  parseModelTuple,
} from 'react-client/src/ReactFlightClient';

export {
  resolveModuleReference,
  preloadModule,
  requireModule,
} from 'ReactFlightNativeRelayClientIntegration';

export type {ModuleMetaData} from 'ReactFlightNativeRelayClientIntegration';

export type UninitializedModel = JSONValue;

export type Response = ResponseBase;

function parseModelRecursively(response: Response, parentObj, value) {
  if (typeof value === 'string') {
    return parseModelString(response, parentObj, value);
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      const parsedValue = [];
      for (let i = 0; i < value.length; i++) {
        (parsedValue: any)[i] = parseModelRecursively(
          response,
          value,
          value[i],
        );
      }
      return parseModelTuple(response, parsedValue);
    } else {
      const parsedValue = {};
      for (const innerKey in value) {
        (parsedValue: any)[innerKey] = parseModelRecursively(
          response,
          value,
          value[innerKey],
        );
      }
      return parsedValue;
    }
  }
  return value;
}

const dummy = {};

export function parseModel<T>(response: Response, json: UninitializedModel): T {
  return (parseModelRecursively(response, dummy, json): any);
}
