/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMUnknownPropertyDevtool
 */

'use strict';

var DOMProperty = require('DOMProperty');
var EventPluginRegistry = require('EventPluginRegistry');

var warning = require('warning');

if (__DEV__) {
  var reactProps = {
    children: true,
    dangerouslySetInnerHTML: true,
    key: true,
    ref: true,
  };
  var warnedProperties = {};

  var warnUnknownProperty = function(name) {
    if (DOMProperty.properties.hasOwnProperty(name) || DOMProperty.isCustomAttribute(name)) {
      return;
    }
    if (reactProps.hasOwnProperty(name) && reactProps[name] ||
        warnedProperties.hasOwnProperty(name) && warnedProperties[name]) {
      return;
    }

    warnedProperties[name] = true;
    var lowerCasedName = name.toLowerCase();

    // data-* attributes should be lowercase; suggest the lowercase version
    var standardName = (
      DOMProperty.isCustomAttribute(lowerCasedName) ?
        lowerCasedName :
      DOMProperty.getPossibleStandardName.hasOwnProperty(lowerCasedName) ?
        DOMProperty.getPossibleStandardName[lowerCasedName] :
        null
    );

    // For now, only warn when we have a suggested correction. This prevents
    // logging too much when using transferPropsTo.
    warning(
      standardName == null,
      'Unknown DOM property %s. Did you mean %s?',
      name,
      standardName
    );

    var registrationName = (
      EventPluginRegistry.possibleRegistrationNames.hasOwnProperty(
        lowerCasedName
      ) ?
      EventPluginRegistry.possibleRegistrationNames[lowerCasedName] :
      null
    );

    warning(
      registrationName == null,
      'Unknown event handler property %s. Did you mean `%s`?',
      name,
      registrationName
    );
  };
}

var ReactDOMUnknownPropertyDevtool = {
  onCreateMarkupForProperty(name, value) {
    warnUnknownProperty(name);
  },
  onSetValueForProperty(node, name, value) {
    warnUnknownProperty(name);
  },
  onDeleteValueForProperty(node, name) {
    warnUnknownProperty(name);
  },
}

module.exports = ReactDOMUnknownPropertyDevtool;
