/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';


var emptyFunction = require('emptyFunction');

describe('ReactDOMInput', function() {
  var EventConstants;
  var React;
  var ReactDOM;
  var ReactDOMFeatureFlags;
  var ReactLink;
  var ReactTestUtils;

  beforeEach(function() {
    jest.resetModuleRegistry();
    EventConstants = require('EventConstants');
    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMFeatureFlags = require('ReactDOMFeatureFlags');
    ReactLink = require('ReactLink');
    ReactTestUtils = require('ReactTestUtils');
    spyOn(console, 'error');
  });

  it('should display `defaultValue` of number 0', function() {
    var stub = <input type="text" defaultValue={0} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('0');
  });

  it('should display "true" for `defaultValue` of `true`', function() {
    var stub = <input type="text" defaultValue={true} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('true');
  });

  it('should display "false" for `defaultValue` of `false`', function() {
    var stub = <input type="text" defaultValue={false} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('false');
  });

  it('should display "foobar" for `defaultValue` of `objToString`', function() {
    var objToString = {
      toString: function() {
        return 'foobar';
      },
    };

    var stub = <input type="text" defaultValue={objToString} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('foobar');
  });

  it('should display `value` of number 0', function() {
    var stub = <input type="text" value={0} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('0');
  });

  it('should allow setting `value` to `true`', function() {
    var container = document.createElement('div');
    var stub = <input type="text" value="yolo" onChange={emptyFunction} />;
    stub = ReactDOM.render(stub, container);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('yolo');

    stub = ReactDOM.render(
      <input type="text" value={true} onChange={emptyFunction} />,
      container
    );
    expect(node.value).toEqual('true');
  });

  it('should allow setting `value` to `false`', function() {
    var container = document.createElement('div');
    var stub = <input type="text" value="yolo" onChange={emptyFunction} />;
    stub = ReactDOM.render(stub, container);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('yolo');

    stub = ReactDOM.render(
      <input type="text" value={false} onChange={emptyFunction} />,
      container
    );
    expect(node.value).toEqual('false');
  });

  it('should allow setting `value` to `objToString`', function() {
    var container = document.createElement('div');
    var stub = <input type="text" value="foo" onChange={emptyFunction} />;
    stub = ReactDOM.render(stub, container);
    var node = ReactDOM.findDOMNode(stub);

    expect(node.value).toBe('foo');

    var objToString = {
      toString: function() {
        return 'foobar';
      },
    };
    stub = ReactDOM.render(
      <input type="text" value={objToString} onChange={emptyFunction} />,
      container
    );
    expect(node.value).toEqual('foobar');
  });

  it('should properly control a value of number `0`', function() {
    var stub = <input type="text" value={0} onChange={emptyFunction} />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    node.value = 'giraffe';
    ReactTestUtils.Simulate.change(node);
    expect(node.value).toBe('0');
  });

  it('should have the correct target value', function() {
    var handled = false;
    var handler = function(event) {
      expect(event.target.nodeName).toBe('INPUT');
      handled = true;
    };
    var stub = <input type="text" value={0} onChange={handler} />;
    var container = document.createElement('div');
    var node = ReactDOM.render(stub, container);

    node.value = 'giraffe';

    var fakeNativeEvent = new function() {};
    fakeNativeEvent.target = node;
    fakeNativeEvent.path = [node, container];
    ReactTestUtils.simulateNativeEventOnNode(
      EventConstants.topLevelTypes.topInput,
      node,
      fakeNativeEvent
    );

    expect(handled).toBe(true);
  });

  it('should not set a value for submit buttons unnecessarily', function() {
    var stub = <input type="submit" />;
    stub = ReactTestUtils.renderIntoDocument(stub);
    var node = ReactDOM.findDOMNode(stub);

    // The value shouldn't be '', or else the button will have no text; it
    // should have the default "Submit" or "Submit Query" label. Most browsers
    // report this as not having a `value` attribute at all; IE reports it as
    // the actual label that the user sees.
    expect(
      !node.hasAttribute('value') || node.getAttribute('value').length > 0
    ).toBe(true);
  });

  it('should control radio buttons', function() {
    var RadioGroup = React.createClass({
      render: function() {
        return (
          <div>
            <input
              ref="a"
              type="radio"
              name="fruit"
              checked={true}
              onChange={emptyFunction}
            />A
            <input
              ref="b"
              type="radio"
              name="fruit"
              onChange={emptyFunction}
            />B

            <form>
              <input
                ref="c"
                type="radio"
                name="fruit"
                defaultChecked={true}
                onChange={emptyFunction}
              />
            </form>
          </div>
        );
      },
    });

    var stub = ReactTestUtils.renderIntoDocument(<RadioGroup />);
    var aNode = ReactDOM.findDOMNode(stub.refs.a);
    var bNode = ReactDOM.findDOMNode(stub.refs.b);
    var cNode = ReactDOM.findDOMNode(stub.refs.c);

    expect(aNode.checked).toBe(true);
    expect(bNode.checked).toBe(false);
    // c is in a separate form and shouldn't be affected at all here
    expect(cNode.checked).toBe(true);

    bNode.checked = true;
    // This next line isn't necessary in a proper browser environment, but
    // jsdom doesn't uncheck the others in a group (which makes this whole test
    // a little less effective)
    aNode.checked = false;
    expect(cNode.checked).toBe(true);

    // Now let's run the actual ReactDOMInput change event handler
    ReactTestUtils.Simulate.change(bNode);

    // The original state should have been restored
    expect(aNode.checked).toBe(true);
    expect(cNode.checked).toBe(true);
  });

  it('should support ReactLink', function() {
    var link = new ReactLink('yolo', jest.genMockFn());
    var instance = <input type="text" valueLink={link} />;

    instance = ReactTestUtils.renderIntoDocument(instance);

    expect(ReactDOM.findDOMNode(instance).value).toBe('yolo');
    expect(link.value).toBe('yolo');
    expect(link.requestChange.mock.calls.length).toBe(0);

    ReactDOM.findDOMNode(instance).value = 'test';
    ReactTestUtils.Simulate.change(ReactDOM.findDOMNode(instance));

    expect(link.requestChange.mock.calls.length).toBe(1);
    expect(link.requestChange.mock.calls[0][0]).toEqual('test');
  });

  it('should warn with value and no onChange handler', function() {
    var link = new ReactLink('yolo', jest.genMockFn());
    ReactTestUtils.renderIntoDocument(<input type="text" valueLink={link} />);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      '`valueLink` prop on `input` is deprecated; set `value` and `onChange` instead.'
    );

    ReactTestUtils.renderIntoDocument(
      <input type="text" value="zoink" onChange={jest.genMockFn()} />
    );
    expect(console.error.argsForCall.length).toBe(1);
    ReactTestUtils.renderIntoDocument(<input type="text" value="zoink" />);
    expect(console.error.argsForCall.length).toBe(2);
  });

  it('should warn with value and no onChange handler and readOnly specified', function() {
    ReactTestUtils.renderIntoDocument(
      <input type="text" value="zoink" readOnly={true} />
    );
    expect(console.error.argsForCall.length).toBe(0);

    ReactTestUtils.renderIntoDocument(
      <input type="text" value="zoink" readOnly={false} />
    );
    expect(console.error.argsForCall.length).toBe(1);
  });

  it('should have a this value of undefined if bind is not used', function() {
    var unboundInputOnChange = function() {
      expect(this).toBe(undefined);
    };

    var instance = <input type="text" onChange={unboundInputOnChange} />;
    instance = ReactTestUtils.renderIntoDocument(instance);

    ReactTestUtils.Simulate.change(instance);
  });

  it('should throw if both value and valueLink are provided', function() {
    var node = document.createElement('div');
    var link = new ReactLink('yolo', jest.genMockFn());
    var instance = <input type="text" valueLink={link} />;

    expect(() => ReactDOM.render(instance, node)).not.toThrow();

    instance =
      <input
        type="text"
        valueLink={link}
        value="test"
        onChange={emptyFunction}
      />;
    expect(() => ReactDOM.render(instance, node)).toThrow();

    instance = <input type="text" valueLink={link} onChange={emptyFunction} />;
    expect(() => ReactDOM.render(instance, node)).toThrow();

  });

  it('should support checkedLink', function() {
    var link = new ReactLink(true, jest.genMockFn());
    var instance = <input type="checkbox" checkedLink={link} />;

    instance = ReactTestUtils.renderIntoDocument(instance);

    expect(ReactDOM.findDOMNode(instance).checked).toBe(true);
    expect(link.value).toBe(true);
    expect(link.requestChange.mock.calls.length).toBe(0);

    ReactDOM.findDOMNode(instance).checked = false;
    ReactTestUtils.Simulate.change(ReactDOM.findDOMNode(instance));

    expect(link.requestChange.mock.calls.length).toBe(1);
    expect(link.requestChange.mock.calls[0][0]).toEqual(false);
  });

  it('should warn with checked and no onChange handler', function() {
    var node = document.createElement('div');
    var link = new ReactLink(true, jest.genMockFn());
    ReactDOM.render(<input type="checkbox" checkedLink={link} />, node);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      '`checkedLink` prop on `input` is deprecated; set `value` and `onChange` instead.'
    );

    ReactTestUtils.renderIntoDocument(
      <input
        type="checkbox"
        checked="false"
        onChange={jest.genMockFn()}
      />
    );
    expect(console.error.argsForCall.length).toBe(1);

    ReactTestUtils.renderIntoDocument(
      <input type="checkbox" checked="false" readOnly={true} />
    );
    expect(console.error.argsForCall.length).toBe(1);

    ReactTestUtils.renderIntoDocument(<input type="checkbox" checked="false" />);
    expect(console.error.argsForCall.length).toBe(2);
  });

  it('should warn with checked and no onChange handler with readOnly specified', function() {
    ReactTestUtils.renderIntoDocument(
      <input type="checkbox" checked="false" readOnly={true} />
    );
    expect(console.error.argsForCall.length).toBe(0);

    ReactTestUtils.renderIntoDocument(
      <input type="checkbox" checked="false" readOnly={false} />
    );
    expect(console.error.argsForCall.length).toBe(1);
  });

  it('should throw if both checked and checkedLink are provided', function() {
    var node = document.createElement('div');
    var link = new ReactLink(true, jest.genMockFn());
    var instance = <input type="checkbox" checkedLink={link} />;

    expect(() => ReactDOM.render(instance, node)).not.toThrow();

    instance =
      <input
        type="checkbox"
        checkedLink={link}
        checked="false"
        onChange={emptyFunction}
      />;
    expect(() => ReactDOM.render(instance, node)).toThrow();

    instance =
      <input type="checkbox" checkedLink={link} onChange={emptyFunction} />;
    expect(() => ReactDOM.render(instance, node)).toThrow();

  });

  it('should throw if both checkedLink and valueLink are provided', function() {
    var node = document.createElement('div');
    var link = new ReactLink(true, jest.genMockFn());
    var instance = <input type="checkbox" checkedLink={link} />;

    expect(() => ReactDOM.render(instance, node)).not.toThrow();

    instance = <input type="checkbox" valueLink={link} />;
    expect(() => ReactDOM.render(instance, node)).not.toThrow();

    instance =
      <input type="checkbox" checkedLink={link} valueLink={emptyFunction} />;
    expect(() => ReactDOM.render(instance, node)).toThrow();
  });

  it('should warn if value is null', function() {
    ReactTestUtils.renderIntoDocument(<input type="text" value={null} />);
    expect(console.error.argsForCall[0][0]).toContain(
      '`value` prop on `input` should not be null. ' +
      'Consider using the empty string to clear the component or `undefined` ' +
      'for uncontrolled components.'
    );

    ReactTestUtils.renderIntoDocument(<input type="text" value={null} />);
    expect(console.error.argsForCall.length).toBe(1);
  });

  it('should warn if checked and defaultChecked props are specified', function() {
    ReactTestUtils.renderIntoDocument(
      <input type="radio" checked={true} defaultChecked={true} readOnly={true} />
    );
    expect(console.error.argsForCall[0][0]).toContain(
      'A component contains an input of type radio with both checked and defaultChecked props. ' +
      'Input elements must be either controlled or uncontrolled ' +
      '(specify either the checked prop, or the defaultChecked prop, but not ' +
      'both). Decide between using a controlled or uncontrolled input ' +
      'element and remove one of these props. More info: ' +
      'https://fb.me/react-controlled-components'
    );

    ReactTestUtils.renderIntoDocument(
      <input type="radio" checked={true} defaultChecked={true} readOnly={true} />
    );
    expect(console.error.argsForCall.length).toBe(1);
  });

  it('should warn if value and defaultValue props are specified', function() {
    ReactTestUtils.renderIntoDocument(
      <input type="text" value="foo" defaultValue="bar" readOnly={true} />
    );
    expect(console.error.argsForCall[0][0]).toContain(
      'A component contains an input of type text with both value and defaultValue props. ' +
      'Input elements must be either controlled or uncontrolled ' +
      '(specify either the value prop, or the defaultValue prop, but not ' +
      'both). Decide between using a controlled or uncontrolled input ' +
      'element and remove one of these props. More info: ' +
      'https://fb.me/react-controlled-components'
    );

    ReactTestUtils.renderIntoDocument(
      <input type="text" value="foo" defaultValue="bar" readOnly={true} />
    );
    expect(console.error.argsForCall.length).toBe(1);
  });

  it('should warn if controlled input switches to uncontrolled', function() {
    var stub = <input type="text" value="controlled" onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="text" />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type text to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if controlled input switches to uncontrolled with defaultValue', function() {
    var stub = <input type="text" value="controlled" onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="text" defaultValue="uncontrolled" />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type text to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if uncontrolled input switches to controlled', function() {
    var stub = <input type="text" />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="text" value="controlled" />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a uncontrolled input of type text to be controlled. ' +
      'Input elements should not switch from uncontrolled to controlled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if controlled checkbox switches to uncontrolled', function() {
    var stub = <input type="checkbox" checked={true} onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="checkbox" />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type checkbox to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if controlled checkbox switches to uncontrolled with defaultChecked', function() {
    var stub = <input type="checkbox" checked={true} onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="checkbox" defaultChecked={true} />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type checkbox to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if uncontrolled checkbox switches to controlled', function() {
    var stub = <input type="checkbox" />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="checkbox" checked={true} />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a uncontrolled input of type checkbox to be controlled. ' +
      'Input elements should not switch from uncontrolled to controlled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if controlled radio switches to uncontrolled', function() {
    var stub = <input type="radio" checked={true} onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="radio" />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type radio to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if controlled radio switches to uncontrolled with defaultChecked', function() {
    var stub = <input type="radio" checked={true} onChange={emptyFunction} />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="radio" defaultChecked={true} />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a controlled input of type radio to be uncontrolled. ' +
      'Input elements should not switch from controlled to uncontrolled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('should warn if uncontrolled radio switches to controlled', function() {
    var stub = <input type="radio" />;
    var container = document.createElement('div');
    ReactDOM.render(stub, container);
    ReactDOM.render(<input type="radio" checked={true} />, container);
    expect(console.error.argsForCall.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'A component is changing a uncontrolled input of type radio to be controlled. ' +
      'Input elements should not switch from uncontrolled to controlled (or vice versa). ' +
      'Decide between using a controlled or uncontrolled input ' +
      'element for the lifetime of the component. More info: https://fb.me/react-controlled-components'
    );
  });

  it('sets type before value always', function() {
    if (!ReactDOMFeatureFlags.useCreateElement) {
      return;
    }
    var log = [];
    var originalCreateElement = document.createElement;
    spyOn(document, 'createElement').andCallFake(function(type) {
      var el = originalCreateElement.apply(this, arguments);
      if (type === 'input') {
        Object.defineProperty(el, 'value', {
          get: function() {},
          set: function() {
            log.push('set value');
          },
        });
        spyOn(el, 'setAttribute').andCallFake(function(name, value) {
          log.push('set ' + name);
        });
      }
      return el;
    });

    ReactTestUtils.renderIntoDocument(<input value="hi" type="radio" />);
    // Setting value before type does bad things. Make sure we set type first.
    expect(log).toEqual([
      'set data-reactroot',
      'set type',
      'set value',
    ]);
  });

  it('sets value properly with type coming later in props', function() {
    var input = ReactTestUtils.renderIntoDocument(
      <input value="hi" type="radio" />
    );
    expect(input.value).toBe('hi');
  });
});
