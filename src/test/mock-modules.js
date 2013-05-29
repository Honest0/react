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
 * @providesModule mock-modules
 */

var global = Function("return this")();
require('test/mock-timers').installMockTimers(global);

exports.dumpCache = function() {
    require("mocks").clear();
    return exports;
};

exports.dontMock = function() {
    return exports;
};

exports.mock = function() {
    return exports;
};
