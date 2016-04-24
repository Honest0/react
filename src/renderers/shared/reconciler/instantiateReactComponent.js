/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule instantiateReactComponent
 */

'use strict';

var ReactCompositeComponent = require('ReactCompositeComponent');
var ReactEmptyComponent = require('ReactEmptyComponent');
var ReactNativeComponent = require('ReactNativeComponent');
var ReactInstrumentation = require('ReactInstrumentation');

var invariant = require('invariant');
var warning = require('warning');

// To avoid a cyclic dependency, we create the final class in this module
var ReactCompositeComponentWrapper = function(element) {
  this.construct(element);
};
Object.assign(
  ReactCompositeComponentWrapper.prototype,
  ReactCompositeComponent.Mixin,
  {
    _instantiateReactComponent: instantiateReactComponent,
  }
);

function getDeclarationErrorAddendum(owner) {
  if (owner) {
    var name = owner.getName();
    if (name) {
      return ' Check the render method of `' + name + '`.';
    }
  }
  return '';
}

function getDisplayName(instance) {
  var element = instance._currentElement;
  if (element == null) {
    return '#empty';
  } else if (typeof element === 'string' || typeof element === 'number') {
    return '#text';
  } else if (typeof element.type === 'string') {
    return element.type;
  } else if (instance.getName) {
    return instance.getName() || 'Unknown';
  } else {
    return element.type.displayName || element.type.name || 'Unknown';
  }
}

/**
 * Check if the type reference is a known internal type. I.e. not a user
 * provided composite type.
 *
 * @param {function} type
 * @return {boolean} Returns true if this is a valid internal type.
 */
function isInternalComponentType(type) {
  return (
    typeof type === 'function' &&
    typeof type.prototype !== 'undefined' &&
    typeof type.prototype.mountComponent === 'function' &&
    typeof type.prototype.receiveComponent === 'function'
  );
}

var nextDebugID = 1;

/**
 * Given a ReactNode, create an instance that will actually be mounted.
 *
 * @param {ReactNode} node
 * @return {object} A new instance of the element's constructor.
 * @protected
 */
function instantiateReactComponent(node) {
  var instance;

  var isNative = false;
  var isComposite = false;
  var isEmpty = false;

  if (node === null || node === false) {
    isEmpty = true;
    instance = ReactEmptyComponent.create(instantiateReactComponent);
  } else if (typeof node === 'object') {
    var element = node;
    invariant(
      element && (typeof element.type === 'function' ||
                  typeof element.type === 'string'),
      'Element type is invalid: expected a string (for built-in components) ' +
      'or a class/function (for composite components) but got: %s.%s',
      element.type == null ? element.type : typeof element.type,
      getDeclarationErrorAddendum(element._owner)
    );

    // Special case string values
    if (typeof element.type === 'string') {
      isNative = true;
      instance = ReactNativeComponent.createInternalComponent(element);
    } else if (isInternalComponentType(element.type)) {
      isComposite = true;
      // This is temporarily available for custom components that are not string
      // representations. I.e. ART. Once those are updated to use the string
      // representation, we can drop this code path.
      instance = new element.type(element);
    } else {
      isComposite = true;
      instance = new ReactCompositeComponentWrapper(element);
    }
  } else if (typeof node === 'string' || typeof node === 'number') {
    instance = ReactNativeComponent.createInstanceForText(node);
  } else {
    invariant(
      false,
      'Encountered invalid React node of type %s',
      typeof node
    );
  }

  if (__DEV__) {
    warning(
      typeof instance.mountComponent === 'function' &&
      typeof instance.receiveComponent === 'function' &&
      typeof instance.getNativeNode === 'function' &&
      typeof instance.unmountComponent === 'function',
      'Only React Components can be mounted.'
    );
  }

  // These two fields are used by the DOM and ART diffing algorithms
  // respectively. Instead of using expandos on components, we should be
  // storing the state needed by the diffing algorithms elsewhere.
  instance._mountIndex = 0;
  instance._mountImage = null;

  if (__DEV__) {
    instance._isOwnerNecessary = false;
    instance._warnedAboutRefsInRender = false;
  }

  if (__DEV__) {
    var debugID = nextDebugID++;
    instance._debugID = debugID;

    var displayName = getDisplayName(instance);
    ReactInstrumentation.debugTool.onSetDisplayName(debugID, displayName);
    ReactInstrumentation.debugTool.onSetIsEmpty(debugID, isEmpty);
    if (isNative || isComposite) {
      ReactInstrumentation.debugTool.onSetChildren(debugID, []);
    }
    var owner = node && node._owner;
    if (owner) {
      ReactInstrumentation.debugTool.onSetOwner(debugID, owner._debugID);
    }
  }

  // Internal instances should fully constructed at this point, so they should
  // not get any new fields added to them at this point.
  if (__DEV__) {
    if (Object.preventExtensions) {
      Object.preventExtensions(instance);
    }
  }

  return instance;
}

module.exports = instantiateReactComponent;
