/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

class JSResourceReference {
  constructor(exportedValue) {
    this._moduleId = exportedValue;
  }
  getModuleID() {
    return this._moduleId;
  }
}

module.exports = JSResourceReference;
