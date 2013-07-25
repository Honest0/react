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
 * @providesModule ImmutableObject
 * @typechecks
 */

"use strict";

var invariant = require('invariant');
var merge = require('merge');
var mergeInto = require('mergeInto');
var mergeHelpers = require('mergeHelpers');

var checkMergeObjectArgs = mergeHelpers.checkMergeObjectArgs;
var isTerminal = mergeHelpers.isTerminal;

/**
 * Wrapper around JavaScript objects that provide a guarantee of immutability at
 * developer time when strict mode is used. The extra computations required to
 * enforce immutability is stripped out in production for performance reasons.
 */
var ImmutableObject;

function assertImmutableObject(immutableObject) {
  invariant(
    immutableObject instanceof ImmutableObject,
    'ImmutableObject: Attempted to set fields on an object that is not an ' +
    'instance of ImmutableObject.'
  );
}

if (__DEV__) {
  /**
   * Constructs an instance of `ImmutableObject`.
   *
   * @param {?object} initialProperties The initial set of properties.
   * @constructor
   */
  ImmutableObject = function ImmutableObject(initialProperties) {
    mergeInto(this, initialProperties);
    deepFreeze(this);
  };

  /**
   * Checks if an object should be deep frozen. Instances of `ImmutableObject`
   * are assumed to have already been deep frozen.
   *
   * @param {*} object The object to check.
   * @return {boolean} Whether or not deep freeze is needed.
   */
  var shouldRecurseFreeze = function(object) {
    return (
      typeof object === 'object' &&
      !(object instanceof ImmutableObject) &&
      object !== null
    );
  };

  /**
   * Freezes the supplied object deeply.
   *
   * @param {*} object The object to freeze.
   */
  var deepFreeze = function(object) {
    Object.freeze(object); // First freeze the object.
    for (var prop in object) {
      var field = object[prop];
      if (object.hasOwnProperty(prop) && shouldRecurseFreeze(field)) {
        deepFreeze(field);
      }
    }
  };

  /**
   * Returns a new ImmutableObject that is identical to the supplied object but
   * with the supplied changes, `put`.
   *
   * @param {ImmutableObject} immutableObject Starting object.
   * @param {?object} put Fields to merge into the object.
   * @return {ImmutableObject} The result of merging in `put` fields.
   */
  ImmutableObject.set = function(immutableObject, put) {
    assertImmutableObject(immutableObject);
    var totalNewFields = merge(immutableObject, put);
    return new ImmutableObject(totalNewFields);
  };

} else {
  /**
   * Constructs an instance of `ImmutableObject`.
   *
   * @param {?object} initialProperties The initial set of properties.
   * @constructor
   */
  ImmutableObject = function ImmutableObject(initialProperties) {
    mergeInto(this, initialProperties);
  };

  /**
   * Returns a new ImmutableObject that is identical to the supplied object but
   * with the supplied changes, `put`.
   *
   * @param {ImmutableObject} immutableObject Starting object.
   * @param {?object} put Fields to merge into the object.
   * @return {ImmutableObject} The result of merging in `put` fields.
   */
  ImmutableObject.set = function(immutableObject, put) {
    assertImmutableObject(immutableObject);
    var newMap = new ImmutableObject(immutableObject);
    mergeInto(newMap, put);
    return newMap;
  };
}

/**
 * Sugar for `ImmutableObject.set(ImmutableObject, {fieldName: putField})`.
 *
 * @param {ImmutableObject} immutableObject Object on which to set field.
 * @param {string} fieldName Name of the field to set.
 * @param {*} putField Value of the field to set.
 * @return {ImmutableObject} [description]
 */
ImmutableObject.setField = function(immutableObject, fieldName, putField) {
  var put = {};
  put[fieldName] = putField;
  return ImmutableObject.set(immutableObject, put);
};

/**
 * Returns a new ImmutableObject that is identical to the supplied object but
 * with the supplied changes recursively applied.
 *
 * @param {ImmutableObject} immutableObject Object on which to set fields.
 * @param {object} put Fields to merge into the object.
 * @return {ImmutableObject} The result of merging in `put` fields.
 */
ImmutableObject.setDeep = function(immutableObject, put) {
  assertImmutableObject(immutableObject);
  return _setDeep(immutableObject, put);
};

function _setDeep(object, put) {
  checkMergeObjectArgs(object, put);
  var totalNewFields = {};

  // To maintain the order of the keys, copy the base object's entries first.
  var keys = Object.keys(object);
  for (var ii = 0; ii < keys.length; ii++) {
    var key = keys[ii];
    if (!put.hasOwnProperty(key)) {
      totalNewFields[key] = object[key];
    } else if (isTerminal(object[key]) || isTerminal(put[key])) {
      totalNewFields[key] = put[key];
    } else {
      totalNewFields[key] = _setDeep(object[key], put[key]);
    }
  }

  // Apply any new keys that the base object didn't have.
  var newKeys = Object.keys(put);
  for (ii = 0; ii < newKeys.length; ii++) {
    var newKey = newKeys[ii];
    if (object.hasOwnProperty(newKey)) {
      continue;
    }
    totalNewFields[newKey] = put[newKey];
  }

  return (object instanceof ImmutableObject || put instanceof ImmutableObject) ?
    new ImmutableObject(totalNewFields) :
    totalNewFields;
}

module.exports = ImmutableObject;
