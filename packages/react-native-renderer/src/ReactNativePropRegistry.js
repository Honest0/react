/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

var objects = {};
var uniqueID = 1;
var emptyObject = {};

class ReactNativePropRegistry {
  static register(object: Object): number {
    var id = ++uniqueID;
    if (__DEV__) {
      Object.freeze(object);
    }
    objects[id] = object;
    return id;
  }

  static getByID(id: number): Object {
    if (!id) {
      // Used in the style={[condition && id]} pattern,
      // we want it to be a no-op when the value is false or null
      return emptyObject;
    }

    var object = objects[id];
    if (!object) {
      console.warn('Invalid style with id `' + id + '`. Skipping ...');
      return emptyObject;
    }
    return object;
  }
}

export default ReactNativePropRegistry;
