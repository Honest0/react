/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

class JSResourceReferenceImpl {
  constructor(moduleId) {
    this._moduleId = moduleId;
  }
  getModuleId() {
    return this._moduleId;
  }
}

module.exports = JSResourceReferenceImpl;
