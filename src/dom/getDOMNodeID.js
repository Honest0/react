/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule getDOMNodeID
 */

"use strict";

/**
 * Accessing "id" or calling getAttribute('id') on a form element can return its
 * control whose name or ID is "id". However, not all DOM nodes support
 * `getAttributeNode` (document - which is not a form) so that is checked first.
 *
 * @param {Element} domNode DOM node element to return ID of.
 * @returns {string} The ID of `domNode`.
 */
function getDOMNodeID(domNode) {
  if (domNode.getAttributeNode) {
    var attributeNode = domNode.getAttributeNode('id');
    return attributeNode && attributeNode.value || '';
  } else {
    return domNode.id || '';
  }
}

module.exports = getDOMNodeID;
