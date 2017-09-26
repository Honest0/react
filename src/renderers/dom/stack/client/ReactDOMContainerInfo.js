/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactDOMContainerInfo
 */

'use strict';

var validateDOMNesting = require('validateDOMNesting');
var {DOCUMENT_NODE} = require('HTMLNodeType');

function ReactDOMContainerInfo(topLevelWrapper, node) {
  var info = {
    _topLevelWrapper: topLevelWrapper,
    _idCounter: 1,
    _ownerDocument: node
      ? node.nodeType === DOCUMENT_NODE ? node : node.ownerDocument
      : null,
    _node: node,
    _tag: node ? node.nodeName.toLowerCase() : null,
    _namespaceURI: node ? node.namespaceURI : null,
  };
  if (__DEV__) {
    info._ancestorInfo = node
      ? validateDOMNesting.updatedAncestorInfo(null, info._tag, null)
      : null;
  }
  return info;
}

module.exports = ReactDOMContainerInfo;
