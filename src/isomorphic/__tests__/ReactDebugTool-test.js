/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDebugTool', function() {
  var ReactDebugTool;

  beforeEach(function() {
    jest.resetModuleRegistry();
    ReactDebugTool = require('ReactDebugTool');
  });

  it('should add and remove devtools', () => {
    var handler1 = jasmine.createSpy('spy');
    var handler2 = jasmine.createSpy('spy');
    var devtool1 = {onTestEvent: handler1};
    var devtool2 = {onTestEvent: handler2};

    ReactDebugTool.addDevtool(devtool1);
    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(1);
    expect(handler2.calls.length).toBe(0);

    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(2);
    expect(handler2.calls.length).toBe(0);

    ReactDebugTool.addDevtool(devtool2);
    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(3);
    expect(handler2.calls.length).toBe(1);

    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(4);
    expect(handler2.calls.length).toBe(2);

    ReactDebugTool.removeDevtool(devtool1);
    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(4);
    expect(handler2.calls.length).toBe(3);

    ReactDebugTool.removeDevtool(devtool2);
    ReactDebugTool.onTestEvent();
    expect(handler1.calls.length).toBe(4);
    expect(handler2.calls.length).toBe(3);
  });

  it('warns once when an error is thrown in devtool', () => {
    spyOn(console, 'error');
    ReactDebugTool.addDevtool({
      onTestEvent() {
        throw new Error('Hi.');
      },
    });

    ReactDebugTool.onTestEvent();
    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'exception thrown by devtool while handling ' +
      'onTestEvent: Hi.'
    );

    ReactDebugTool.onTestEvent();
    expect(console.error.calls.length).toBe(1);
  });
});
