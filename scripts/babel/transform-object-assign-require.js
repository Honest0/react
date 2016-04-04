/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

module.exports = function autoImporter(babel) {
  const t = babel.types;

  return {
    pre: function() {
      // map from module to generated identifier
      this.id = null;
    },

    visitor: {
      CallExpression: function(path, file) {
        if (path.get('callee').matchesPattern('Object.assign')) {
          // generate identifier and require if it hasn't been already
          if (!this.id) {
            this.id = path.scope.generateUidIdentifier('assign');
            path.scope.getProgramParent().push({
              id: this.id,
              init: t.callExpression(
                t.identifier('require'),
                [t.stringLiteral('object-assign')]
              ),
            });
          }
          path.node.callee = this.id;
        }
      },
    },
  };
};
