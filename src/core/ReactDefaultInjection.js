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
 * @providesModule ReactDefaultInjection
 */

"use strict";

var ReactDOM = require('ReactDOM');
var ReactDOMForm = require('ReactDOMForm');
var ReactDOMInput = require('ReactDOMInput');
var ReactDOMOption = require('ReactDOMOption');
var ReactDOMSelect = require('ReactDOMSelect');
var ReactDOMTextarea = require('ReactDOMTextarea');
var ReactEventEmitter = require('ReactEventEmitter');
var ReactEventTopLevelCallback = require('ReactEventTopLevelCallback');

var DefaultDOMPropertyConfig = require('DefaultDOMPropertyConfig');
var DOMProperty = require('DOMProperty');

var DefaultEventPluginOrder = require('DefaultEventPluginOrder');
var EnterLeaveEventPlugin = require('EnterLeaveEventPlugin');
var ChangeEventPlugin = require('ChangeEventPlugin');
var EventPluginHub = require('EventPluginHub');
var ReactInstanceHandles = require('ReactInstanceHandles');
var SimpleEventPlugin = require('SimpleEventPlugin');
var MobileSafariClickEventPlugin = require('MobileSafariClickEventPlugin');

function inject() {
  ReactEventEmitter.TopLevelCallbackCreator = ReactEventTopLevelCallback;
  /**
   * Inject module for resolving DOM hierarchy and plugin ordering.
   */
  EventPluginHub.injection.injectEventPluginOrder(DefaultEventPluginOrder);
  EventPluginHub.injection.injectInstanceHandle(ReactInstanceHandles);

  /**
   * Some important event plugins included by default (without having to require
   * them).
   */
  EventPluginHub.injection.injectEventPluginsByName({
    'SimpleEventPlugin': SimpleEventPlugin,
    'EnterLeaveEventPlugin': EnterLeaveEventPlugin,
    'ChangeEventPlugin': ChangeEventPlugin,
    'MobileSafariClickEventPlugin': MobileSafariClickEventPlugin
  });

  ReactDOM.injection.injectComponentClasses({
    form: ReactDOMForm,
    input: ReactDOMInput,
    option: ReactDOMOption,
    select: ReactDOMSelect,
    textarea: ReactDOMTextarea
  });

  DOMProperty.injection.injectDOMPropertyConfig(DefaultDOMPropertyConfig);
}

module.exports = {
  inject: inject
};
