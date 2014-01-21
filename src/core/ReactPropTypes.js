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
 * @providesModule ReactPropTypes
 */

"use strict";

var ReactComponent = require('ReactComponent');
var ReactPropTypeLocationNames = require('ReactPropTypeLocationNames');

var warning = require('warning');
var createObjectFrom = require('createObjectFrom');

/**
 * Collection of methods that allow declaration and validation of props that are
 * supplied to React components. Example usage:
 *
 *   var Props = require('ReactPropTypes');
 *   var MyArticle = React.createClass({
 *     propTypes: {
 *       // An optional string prop named "description".
 *       description: Props.string,
 *
 *       // A required enum prop named "category".
 *       category: Props.oneOf(['News','Photos']).isRequired,
 *
 *       // A prop named "dialog" that requires an instance of Dialog.
 *       dialog: Props.instanceOf(Dialog).isRequired
 *     },
 *     render: function() { ... }
 *   });
 *
 * A more formal specification of how these methods are used:
 *
 *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
 *   decl := ReactPropTypes.{type}(.isRequired)?
 *
 * Each and every declaration produces a function with the same signature. This
 * allows the creation of custom validation functions. For example:
 *
 *   var Props = require('ReactPropTypes');
 *   var MyLink = React.createClass({
 *     propTypes: {
 *       // An optional string or URI prop named "href".
 *       href: function(props, propName, componentName) {
 *         var propValue = props[propName];
 *         warning(
 *           propValue == null ||
 *           typeof propValue === 'string' ||
 *           propValue instanceof URI,
 *           'Invalid `%s` supplied to `%s`, expected string or URI.',
 *           propName,
 *           componentName
 *         );
 *       }
 *     },
 *     render: function() { ... }
 *   });
 *
 * @internal
 */
var Props = {

  array: createPrimitiveTypeChecker('array'),
  bool: createPrimitiveTypeChecker('boolean'),
  func: createPrimitiveTypeChecker('function'),
  number: createPrimitiveTypeChecker('number'),
  object: createPrimitiveTypeChecker('object'),
  string: createPrimitiveTypeChecker('string'),

  shape: createShapeTypeChecker,
  oneOf: createEnumTypeChecker,
  oneOfType: createUnionTypeChecker,

  instanceOf: createInstanceTypeChecker,

  renderable: createRenderableTypeChecker(),

  component: createComponentTypeChecker(),

  any: createAnyTypeChecker()
};

var ANONYMOUS = '<<anonymous>>';

function createAnyTypeChecker() {
  function validateAnyType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    // always is valid
    return true;
  }
  return createChainableTypeChecker(validateAnyType);
}

function isRenderable(propValue) {
  switch(typeof propValue) {
    case 'number':
    case 'string':
      return true;
    case 'object':
      if (Array.isArray(propValue)) {
        return propValue.every(isRenderable);
      }
      if (ReactComponent.isValidComponent(propValue)) {
        return true;
      }
      for (var k in propValue) {
        if (!isRenderable(propValue[k])) {
          return false;
        }
      }
      return true;
    default:
      return false;
  }
}

// Equivalent of typeof but with special handling for arrays
function getPropType(propValue) {
  var propType = typeof propValue;
  if (propType === 'object' && Array.isArray(propValue)) {
    return 'array';
  }
  return propType;
}

function createPrimitiveTypeChecker(expectedType) {
  function validatePrimitiveType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var propType = getPropType(propValue);
    var isValid = propType === expectedType;
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` of type `%s` supplied to `%s`, expected `%s`.',
      ReactPropTypeLocationNames[location],
      propName,
      propType,
      componentName,
      expectedType
    );
  }
  return createChainableTypeChecker(validatePrimitiveType);
}

function createEnumTypeChecker(expectedValues) {
  var expectedEnum = createObjectFrom(expectedValues);
  function validateEnumType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var isValid = expectedEnum[propValue];
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` supplied to `%s`, expected one of %s.',
      ReactPropTypeLocationNames[location],
      propName,
      componentName,
      JSON.stringify(Object.keys(expectedEnum))
    );
  }
  return createChainableTypeChecker(validateEnumType);
}

function createShapeTypeChecker(shapeTypes) {
  function validateShapeType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var propType = getPropType(propValue);
    var isValid = propType === 'object';
    if (isValid) {
      for (var key in shapeTypes) {
        var checker = shapeTypes[key];
        if (checker) {
          // It's going to throw an exception if it doesn't pass
          checker(propValue, key, componentName, location);
        }
      }
    }
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` of type `%s` supplied to `%s`, expected `object`.',
      ReactPropTypeLocationNames[location],
      propName,
      propType,
      componentName
    );
  }
  return createChainableTypeChecker(validateShapeType);
}

function createInstanceTypeChecker(expectedClass) {
  function validateInstanceType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var isValid = propValue instanceof expectedClass;
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` supplied to `%s`, expected instance of `%s`.',
      ReactPropTypeLocationNames[location],
      propName,
      componentName,
      expectedClass.name || ANONYMOUS
    );
  }
  return createChainableTypeChecker(validateInstanceType);
}

function createRenderableTypeChecker() {
  function validateRenderableType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var isValid = isRenderable(propValue);
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` supplied to `%s`, expected a renderable prop.',
      ReactPropTypeLocationNames[location],
      propName,
      componentName
    );
  }
  return createChainableTypeChecker(validateRenderableType);
}

function createComponentTypeChecker() {
  function validateComponentType(
    shouldThrow, propValue, propName, componentName, location
  ) {
    var isValid = ReactComponent.isValidComponent(propValue);
    if (!shouldThrow) {
      return isValid;
    }
    warning(
      isValid,
      'Invalid %s `%s` supplied to `%s`, expected a React component.',
      ReactPropTypeLocationNames[location],
      propName,
      componentName
    );
  }
  return createChainableTypeChecker(validateComponentType);
}

function createChainableTypeChecker(validate) {
  function checkType(
    isRequired, shouldThrow, props, propName, componentName, location
  ) {
    var propValue = props[propName];
    if (propValue != null) {
      // Only validate if there is a value to check.
      return validate(
        shouldThrow,
        propValue,
        propName,
        componentName || ANONYMOUS,
        location
      );
    } else {
      var isValid = !isRequired;
      if (!shouldThrow) {
        return isValid;
      }
      warning(
        isValid,
        'Required %s `%s` was not specified in `%s`.',
        ReactPropTypeLocationNames[location],
        propName,
        componentName || ANONYMOUS
      );
    }
  }

  var checker = checkType.bind(null, false, true);
  checker.weak = checkType.bind(null, false, false);
  checker.isRequired = checkType.bind(null, true, true);
  checker.weak.isRequired = checkType.bind(null, true, false);
  checker.isRequired.weak = checker.weak.isRequired;

  return checker;
}

function createUnionTypeChecker(arrayOfValidators) {
  return function(props, propName, componentName, location) {
    var isValid = false;
    for (var ii = 0; ii < arrayOfValidators.length; ii++) {
      var validate = arrayOfValidators[ii];
      if (typeof validate.weak === 'function') {
        validate = validate.weak;
      }
      if (validate(props, propName, componentName, location)) {
        isValid = true;
        break;
      }
    }
    warning(
      isValid,
      'Invalid %s `%s` supplied to `%s`.',
      ReactPropTypeLocationNames[location],
      propName,
      componentName || ANONYMOUS
    );
  };
}

module.exports = Props;
