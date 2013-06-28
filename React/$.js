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
 * @providesModule $
 */

var ge = require("./ge");

/**
 * Find a node by ID.
 *
 * If your application code depends on the existence of the element, use $,
 * which will throw if the element doesn't exist.
 *
 * If you're not sure whether or not the element exists, use ge instead, and
 * manually check for the element's existence in your application code.
 */
function $(arg) {
  var element = ge(arg);
  if (!element) {
    if (typeof arg == 'undefined') {
      arg = 'undefined';
    } else if (arg === null) {
      arg = 'null';
    }
    throw new Error(
      'Tried to get element "' + arg.toString() + '" but it is not present ' +
      'on the page.'
    );
  }
  return element;
}

module.exports = $;
