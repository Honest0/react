/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule createReactNativeComponentClass
 * @flow
 */

'use strict';

import type {ViewConfigGetter} from './ReactNativeTypes';

const {register} = require('ReactNativeViewConfigRegistry');

/**
 * Creates a renderable ReactNative host component.
 * Use this method for view configs that are loaded from UIManager.
 * Use createReactNativeComponentClass() for view configs defined within JavaScript.
 *
 * @param {string} config iOS View configuration.
 * @private
 */
const createReactNativeComponentClass = function(
  name: string,
  callback: ViewConfigGetter,
): string {
  return register(name, callback);
};

export default createReactNativeComponentClass;
