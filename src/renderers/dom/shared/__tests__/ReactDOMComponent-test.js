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

var assign = require('Object.assign');

describe('ReactDOMComponent', function() {
  var React;

  var ReactDOM;
  var ReactDOMServer;

  beforeEach(function() {
    jest.resetModuleRegistry();
    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMServer = require('ReactDOMServer');
  });

  describe('updateDOM', function() {
    var ReactTestUtils;

    beforeEach(function() {
      ReactTestUtils = require('ReactTestUtils');
    });

    it('should handle className', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div style={{}} />, container);

      ReactDOM.render(<div className={'foo'} />, container);
      expect(container.firstChild.className).toEqual('foo');
      ReactDOM.render(<div className={'bar'} />, container);
      expect(container.firstChild.className).toEqual('bar');
      ReactDOM.render(<div className={null} />, container);
      expect(container.firstChild.className).toEqual('');
    });

    it('should gracefully handle various style value types', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div style={{}} />, container);
      var stubStyle = container.firstChild.style;

      // set initial style
      var setup = {display: 'block', left: '1px', top: 2, fontFamily: 'Arial'};
      ReactDOM.render(<div style={setup} />, container);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.left).toEqual('1px');
      expect(stubStyle.fontFamily).toEqual('Arial');

      // reset the style to their default state
      var reset = {display: '', left: null, top: false, fontFamily: true};
      ReactDOM.render(<div style={reset} />, container);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.left).toEqual('');
      expect(stubStyle.top).toEqual('');
      expect(stubStyle.fontFamily).toEqual('');
    });

    // TODO: (poshannessy) deprecate this pattern.
    it('should update styles when mutating style object', function() {
      // not actually used. Just to suppress the style mutation warning
      spyOn(console, 'error');

      var styles = {display: 'none', fontFamily: 'Arial', lineHeight: 1.2};
      var container = document.createElement('div');
      ReactDOM.render(<div style={styles} />, container);

      var stubStyle = container.firstChild.style;
      stubStyle.display = styles.display;
      stubStyle.fontFamily = styles.fontFamily;

      styles.display = 'block';

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Arial');
      expect(stubStyle.lineHeight).toEqual('1.2');

      styles.fontFamily = 'Helvetica';

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Helvetica');
      expect(stubStyle.lineHeight).toEqual('1.2');

      styles.lineHeight = 0.5;

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Helvetica');
      expect(stubStyle.lineHeight).toEqual('0.5');

      ReactDOM.render(<div style={undefined} />, container);
      expect(stubStyle.display).toBe('');
      expect(stubStyle.fontFamily).toBe('');
      expect(stubStyle.lineHeight).toBe('');
    });

    it('should warn when mutating style', function() {
      spyOn(console, 'error');

      var style = {border: '1px solid black'};
      var App = React.createClass({
        getInitialState: function() {
          return {style: style};
        },
        render: function() {
          return <div style={this.state.style}>asd</div>;
        },
      });

      var stub = ReactTestUtils.renderIntoDocument(<App />);
      style.position = 'absolute';
      stub.setState({style: style});
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toEqual(
        'Warning: `div` was passed a style object that has previously been ' +
        'mutated. Mutating `style` is deprecated. Consider cloning it ' +
        'beforehand. Check the `render` of `App`. Previous style: ' +
        '{border: "1px solid black"}. Mutated style: ' +
        '{border: "1px solid black", position: "absolute"}.'
      );

      style = {background: 'red'};
      stub = ReactTestUtils.renderIntoDocument(<App />);
      style.background = 'green';
      stub.setState({style: {background: 'green'}});
      // already warned once for the same component and owner
      expect(console.error.argsForCall.length).toBe(1);

      style = {background: 'red'};
      var div = document.createElement('div');
      ReactDOM.render(<span style={style}></span>, div);
      style.background = 'blue';
      ReactDOM.render(<span style={style}></span>, div);
      expect(console.error.argsForCall.length).toBe(2);
    });

    it('should warn about styles with numeric string values for non-unitless properties', function() {
      spyOn(console, 'error');

      var div = document.createElement('div');
      var One = React.createClass({
        render: function() {
          return this.props.inline ?
            <span style={{fontSize: '1'}} /> :
            <div style={{fontSize: '1'}} />;
        },
      });
      var Two = React.createClass({
        render: function() {
          return <div style={{fontSize: '1'}} />;
        },
      });
      ReactDOM.render(<One inline={false} />, div);
      expect(console.error.calls.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: a `div` tag (owner: `One`) was passed a numeric string value ' +
        'for CSS property `fontSize` (value: `1`) which will be treated ' +
        'as a unitless number in a future version of React.'
      );

      // Don't warn again for the same component
      ReactDOM.render(<One inline={true} />, div);
      expect(console.error.calls.length).toBe(1);

      // Do warn for different components
      ReactDOM.render(<Two />, div);
      expect(console.error.calls.length).toBe(2);
      expect(console.error.argsForCall[1][0]).toBe(
        'Warning: a `div` tag (owner: `Two`) was passed a numeric string value ' +
        'for CSS property `fontSize` (value: `1`) which will be treated ' +
        'as a unitless number in a future version of React.'
      );

      // Really don't warn again for the same component
      ReactDOM.render(<One inline={true} />, div);
      expect(console.error.calls.length).toBe(2);
    });

    it('should warn semi-nicely about NaN in style', function() {
      spyOn(console, 'error');

      var style = {fontSize: NaN};
      var div = document.createElement('div');
      ReactDOM.render(<span style={style}></span>, div);
      ReactDOM.render(<span style={style}></span>, div);

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toEqual(
        'Warning: `span` was passed a style object that has previously been ' +
        'mutated. Mutating `style` is deprecated. Consider cloning it ' +
        'beforehand. Check the `render` using <span>. Previous style: ' +
        '{fontSize: NaN}. Mutated style: {fontSize: NaN}.'
      );
    });

    it('should update styles if initially null', function() {
      var styles = null;
      var container = document.createElement('div');
      ReactDOM.render(<div style={styles} />, container);

      var stubStyle = container.firstChild.style;

      styles = {display: 'block'};

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');
    });

    it('should update styles if updated to null multiple times', function() {
      var styles = null;
      var container = document.createElement('div');
      ReactDOM.render(<div style={styles} />, container);

      styles = {display: 'block'};
      var stubStyle = container.firstChild.style;

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');

      ReactDOM.render(<div style={null} />, container);
      expect(stubStyle.display).toEqual('');

      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('block');

      ReactDOM.render(<div style={null} />, container);
      expect(stubStyle.display).toEqual('');
    });

    it('should skip child object attribute on web components', function() {
      var container = document.createElement('div');

      // Test initial render to null
      ReactDOM.render(<my-component children={['foo']} />, container);
      expect(container.firstChild.hasAttribute('children')).toBe(false);

      // Test updates to null
      ReactDOM.render(<my-component children={['foo']} />, container);
      expect(container.firstChild.hasAttribute('children')).toBe(false);
    });

    it('should remove attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<img height="17" />, container);

      expect(container.firstChild.hasAttribute('height')).toBe(true);
      ReactDOM.render(<img />, container);
      expect(container.firstChild.hasAttribute('height')).toBe(false);
    });

    it('should remove known SVG camel case attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<svg viewBox="0 0 100 100" />, container);

      expect(container.firstChild.hasAttribute('viewBox')).toBe(true);
      ReactDOM.render(<svg />, container);
      expect(container.firstChild.hasAttribute('viewBox')).toBe(false);
    });

    it('should remove known SVG hyphenated attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<svg clip-path="0 0 100 100" />, container);

      expect(container.firstChild.hasAttribute('clip-path')).toBe(true);
      ReactDOM.render(<svg />, container);
      expect(container.firstChild.hasAttribute('clip-path')).toBe(false);
    });

    it('should remove arbitrary SVG hyphenated attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<svg the-word="the-bird" />, container);

      expect(container.firstChild.hasAttribute('the-word')).toBe(true);
      ReactDOM.render(<svg />, container);
      expect(container.firstChild.hasAttribute('the-word')).toBe(false);
    });

    it('should remove arbitrary SVG camel case attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<svg theWord="theBird" />, container);

      expect(container.firstChild.hasAttribute('theWord')).toBe(true);
      ReactDOM.render(<svg />, container);
      expect(container.firstChild.hasAttribute('theWord')).toBe(false);
    });

    it('should remove SVG attributes that should have been hyphenated', function() {
      spyOn(console, 'error');
      var container = document.createElement('div');
      ReactDOM.render(<svg clipPath="0 0 100 100" />, container);
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('clipPath');
      expect(console.error.argsForCall[0][0]).toContain('clip-path');

      expect(container.firstChild.hasAttribute('clip-path')).toBe(true);
      ReactDOM.render(<svg />, container);
      expect(container.firstChild.hasAttribute('clip-path')).toBe(false);
    });

    it('should remove namespaced SVG attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(
        <svg>
          <image xlinkHref="http://i.imgur.com/w7GCRPb.png" />
        </svg>,
        container
      );

      expect(container.firstChild.firstChild.hasAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href'
      )).toBe(true);
      ReactDOM.render(<svg><image /></svg>, container);
      expect(container.firstChild.firstChild.hasAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href'
      )).toBe(false);
    });

    it('should remove properties', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div className="monkey" />, container);

      expect(container.firstChild.className).toEqual('monkey');
      ReactDOM.render(<div />, container);
      expect(container.firstChild.className).toEqual('');
    });

    it('should clear a single style prop when changing `style`', function() {
      var styles = {display: 'none', color: 'red'};
      var container = document.createElement('div');
      ReactDOM.render(<div style={styles} />, container);

      var stubStyle = container.firstChild.style;

      styles = {color: 'green'};
      ReactDOM.render(<div style={styles} />, container);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('green');
    });

    it('should reject attribute key injection attack on markup', function() {
      spyOn(console, 'error');
      for (var i = 0; i < 3; i++) {
        var container = document.createElement('div');
        var element = React.createElement(
          'x-foo-component',
          {'blah" onclick="beevil" noise="hi': 'selected'},
          null
        );
        ReactDOM.render(element, container);
      }
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toEqual(
        'Warning: Invalid attribute name: `blah" onclick="beevil" noise="hi`'
      );
    });

    it('should reject attribute key injection attack on update', function() {
      spyOn(console, 'error');
      for (var i = 0; i < 3; i++) {
        var container = document.createElement('div');
        var beforeUpdate = React.createElement('x-foo-component', {}, null);
        ReactDOM.render(beforeUpdate, container);

        var afterUpdate = React.createElement(
          'x-foo-component',
          {'blah" onclick="beevil" noise="hi': 'selected'},
          null
        );
        ReactDOM.render(afterUpdate, container);
      }
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toEqual(
        'Warning: Invalid attribute name: `blah" onclick="beevil" noise="hi`'
      );
    });

    it('should update arbitrary attributes for tags containing dashes', function() {
      var container = document.createElement('div');

      var beforeUpdate = React.createElement('x-foo-component', {}, null);
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <x-foo-component myattr="myval" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('myattr')).toBe('myval');
    });

    it('should update known hyphenated attributes for SVG tags', function() {
      var container = document.createElement('div');

      var beforeUpdate = <svg />;
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <svg clip-path="url(#starlet)" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('clip-path')).toBe(
        'url(#starlet)'
      );
    });

    it('should update camel case attributes for SVG tags', function() {
      var container = document.createElement('div');

      var beforeUpdate = <svg />;
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <svg viewBox="0 0 100 100" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('viewBox')).toBe(
        '0 0 100 100'
      );
    });

    it('should warn camel casing hyphenated attributes for SVG tags', function() {
      spyOn(console, 'error');
      var container = document.createElement('div');

      var beforeUpdate = <svg />;
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <svg clipPath="url(#starlet)" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('clip-path')).toBe(
        'url(#starlet)'
      );
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('clipPath');
      expect(console.error.argsForCall[0][0]).toContain('clip-path');
    });

    it('should update arbitrary hyphenated attributes for SVG tags', function() {
      var container = document.createElement('div');

      var beforeUpdate = <svg />;
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <svg the-word="the-bird" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('the-word')).toBe('the-bird');
    });

    it('should update arbitrary camel case attributes for SVG tags', function() {
      var container = document.createElement('div');

      var beforeUpdate = <svg />;
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = <svg theWord="theBird" />;
      ReactDOM.render(afterUpdate, container);

      expect(container.childNodes[0].getAttribute('theWord')).toBe('theBird');
    });

    it('should update namespaced SVG attributes', function() {
      var container = document.createElement('div');

      var beforeUpdate = (
        <svg>
          <image xlinkHref="http://i.imgur.com/w7GCRPb.png" />
        </svg>
      );
      ReactDOM.render(beforeUpdate, container);

      var afterUpdate = (
        <svg>
          <image xlinkHref="http://i.imgur.com/JvqCM2p.png" />
        </svg>
      );
      ReactDOM.render(afterUpdate, container);

      expect(container.firstChild.firstChild.getAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href'
      )).toBe('http://i.imgur.com/JvqCM2p.png');
    });

    it('should clear all the styles when removing `style`', function() {
      var styles = {display: 'none', color: 'red'};
      var container = document.createElement('div');
      ReactDOM.render(<div style={styles} />, container);

      var stubStyle = container.firstChild.style;

      ReactDOM.render(<div />, container);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('');
    });

    it('should update styles when `style` changes from null to object', function() {
      var container = document.createElement('div');
      var styles = {color: 'red'};
      ReactDOM.render(<div style={styles} />, container);
      ReactDOM.render(<div />, container);
      ReactDOM.render(<div style={styles} />, container);

      var stubStyle = container.firstChild.style;
      expect(stubStyle.color).toEqual('red');
    });

    it('should empty element when removing innerHTML', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div dangerouslySetInnerHTML={{__html: ':)'}} />, container);

      expect(container.firstChild.innerHTML).toEqual(':)');
      ReactDOM.render(<div />, container);
      expect(container.firstChild.innerHTML).toEqual('');
    });

    it('should transition from string content to innerHTML', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div>hello</div>, container);

      expect(container.firstChild.innerHTML).toEqual('hello');
      ReactDOM.render(
        <div dangerouslySetInnerHTML={{__html: 'goodbye'}} />,
        container
      );
      expect(container.firstChild.innerHTML).toEqual('goodbye');
    });

    it('should transition from innerHTML to string content', function() {
      var container = document.createElement('div');
      ReactDOM.render(
        <div dangerouslySetInnerHTML={{__html: 'bonjour'}} />,
        container
      );

      expect(container.firstChild.innerHTML).toEqual('bonjour');
      ReactDOM.render(<div>adieu</div>, container);
      expect(container.firstChild.innerHTML).toEqual('adieu');
    });

    it('should transition from innerHTML to children in nested el', function() {
      var container = document.createElement('div');
      ReactDOM.render(
        <div><div dangerouslySetInnerHTML={{__html: 'bonjour'}} /></div>,
        container
      );

      expect(container.textContent).toEqual('bonjour');
      ReactDOM.render(<div><div><span>adieu</span></div></div>, container);
      expect(container.textContent).toEqual('adieu');
    });

    it('should transition from children to innerHTML in nested el', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div><div><span>adieu</span></div></div>, container);

      expect(container.textContent).toEqual('adieu');
      ReactDOM.render(
        <div><div dangerouslySetInnerHTML={{__html: 'bonjour'}} /></div>,
        container
      );
      expect(container.textContent).toEqual('bonjour');
    });

    it('should not incur unnecessary DOM mutations for attributes', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div id="" />, container);

      var node = container.firstChild;
      var nodeSetAttribute = node.setAttribute;
      node.setAttribute = jest.genMockFn();
      node.setAttribute.mockImpl(nodeSetAttribute);

      var nodeRemoveAttribute = node.removeAttribute;
      node.removeAttribute = jest.genMockFn();
      node.removeAttribute.mockImpl(nodeRemoveAttribute);

      ReactDOM.render(<div id="" />, container);
      expect(node.setAttribute.mock.calls.length).toBe(0);
      expect(node.removeAttribute.mock.calls.length).toBe(0);

      ReactDOM.render(<div id="foo" />, container);
      expect(node.setAttribute.mock.calls.length).toBe(1);
      expect(node.removeAttribute.mock.calls.length).toBe(0);

      ReactDOM.render(<div id="foo" />, container);
      expect(node.setAttribute.mock.calls.length).toBe(1);
      expect(node.removeAttribute.mock.calls.length).toBe(0);

      ReactDOM.render(<div />, container);
      expect(node.setAttribute.mock.calls.length).toBe(1);
      expect(node.removeAttribute.mock.calls.length).toBe(1);

      ReactDOM.render(<div id="" />, container);
      expect(node.setAttribute.mock.calls.length).toBe(2);
      expect(node.removeAttribute.mock.calls.length).toBe(1);

      ReactDOM.render(<div />, container);
      expect(node.setAttribute.mock.calls.length).toBe(2);
      expect(node.removeAttribute.mock.calls.length).toBe(2);
    });

    it('should not incur unnecessary DOM mutations for string properties', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div value="" />, container);

      var node = container.firstChild;
      var nodeValue = ''; // node.value always returns undefined
      var nodeValueSetter = jest.genMockFn();
      Object.defineProperty(node, 'value', {
        get: function() {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function(newValue) {
          nodeValue = newValue;
        }),
      });

      ReactDOM.render(<div value="" />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(0);

      ReactDOM.render(<div value="foo" />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(1);

      ReactDOM.render(<div value="foo" />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(1);

      ReactDOM.render(<div />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(2);

      ReactDOM.render(<div value={null} />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(2);

      ReactDOM.render(<div value="" />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(2);

      ReactDOM.render(<div />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(2);
    });

    it('should not incur unnecessary DOM mutations for boolean properties', function() {
      var container = document.createElement('div');
      ReactDOM.render(<div checked={true} />, container);

      var node = container.firstChild;
      var nodeValue = true;
      var nodeValueSetter = jest.genMockFn();
      Object.defineProperty(node, 'checked', {
        get: function() {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function(newValue) {
          nodeValue = newValue;
        }),
      });

      ReactDOM.render(<div checked={true} />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(0);

      ReactDOM.render(<div />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(1);

      ReactDOM.render(<div checked={false} />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(2); // should be 1

      ReactDOM.render(<div checked={true} />, container);
      expect(nodeValueSetter.mock.calls.length).toBe(3);
    });

    it('should ignore attribute whitelist for elements with the "is: attribute', function() {
      var container = document.createElement('div');
      ReactDOM.render(<button is="test" cowabunga="chevynova"/>, container);
      expect(container.firstChild.hasAttribute('cowabunga')).toBe(true);
    });

    it('should not update when switching between null/undefined', function() {
      var container = document.createElement('div');
      var node = ReactDOM.render(<div />, container);

      var setter = jest.genMockFn();
      node.setAttribute = setter;

      ReactDOM.render(<div dir={null} />, container);
      ReactDOM.render(<div dir={undefined} />, container);
      ReactDOM.render(<div />, container);
      expect(setter.mock.calls.length).toBe(0);
      ReactDOM.render(<div dir="ltr" />, container);
      expect(setter.mock.calls.length).toBe(1);
    });

    it('handles multiple child updates without interference', function() {
      // This test might look like it's just testing ReactMultiChild but the
      // last bug in this was actually in DOMChildrenOperations so this test
      // needs to be in some DOM-specific test file.
      var container = document.createElement('div');

      // ABCD
      ReactDOM.render(
        <div>
          <div key="one">
            <div key="A">A</div><div key="B">B</div>
          </div>
          <div key="two">
            <div key="C">C</div><div key="D">D</div>
          </div>
        </div>,
        container
      );
      // BADC
      ReactDOM.render(
        <div>
          <div key="one">
            <div key="B">B</div><div key="A">A</div>
          </div>
          <div key="two">
            <div key="D">D</div><div key="C">C</div>
          </div>
        </div>,
        container
      );

      expect(container.textContent).toBe('BADC');
    });
  });

  describe('createOpenTagMarkup', function() {
    var genMarkup;

    function quoteRegexp(str) {
      return (str + '').replace(/([.?*+\^$\[\]\\(){}|-])/g, '\\$1');
    }

    beforeEach(function() {
      var ReactDefaultInjection = require('ReactDefaultInjection');
      ReactDefaultInjection.inject();

      var ReactDOMComponent = require('ReactDOMComponent');
      var ReactReconcileTransaction = require('ReactReconcileTransaction');

      var NodeStub = function(initialProps) {
        this._currentElement = {props: initialProps};
        this._rootNodeID = 'test';
      };
      assign(NodeStub.prototype, ReactDOMComponent.Mixin);

      genMarkup = function(props) {
        var transaction = new ReactReconcileTransaction();
        return (new NodeStub(props))._createOpenTagMarkupAndPutListeners(
          transaction,
          props
        );
      };

      this.addMatchers({
        toHaveAttribute: function(attr, value) {
          var expected = '(?:^|\\s)' + attr + '=[\\\'"]';
          if (typeof value !== 'undefined') {
            expected += quoteRegexp(value) + '[\\\'"]';
          }
          return this.actual.match(new RegExp(expected));
        },
      });
    });

    it('should generate the correct markup with className', function() {
      expect(genMarkup({className: 'a'})).toHaveAttribute('class', 'a');
      expect(genMarkup({className: 'a b'})).toHaveAttribute('class', 'a b');
      expect(genMarkup({className: ''})).toHaveAttribute('class', '');
    });

    it('should escape style names and values', function() {
      expect(genMarkup({
        style: {'b&ckground': '<3'},
      })).toHaveAttribute('style', 'b&amp;ckground:&lt;3;');
    });
  });

  describe('createContentMarkup', function() {
    var genMarkup;

    function quoteRegexp(str) {
      return (str + '').replace(/([.?*+\^$\[\]\\(){}|-])/g, '\\$1');
    }

    beforeEach(function() {
      var ReactDOMComponent = require('ReactDOMComponent');
      var ReactReconcileTransaction = require('ReactReconcileTransaction');

      var NodeStub = function(initialProps) {
        this._currentElement = {props: initialProps};
        this._rootNodeID = 'test';
      };
      assign(NodeStub.prototype, ReactDOMComponent.Mixin);

      genMarkup = function(props) {
        var transaction = new ReactReconcileTransaction();
        return (new NodeStub(props))._createContentMarkup(
          transaction,
          props,
          {}
        );
      };

      this.addMatchers({
        toHaveInnerhtml: function(html) {
          var expected = '^' + quoteRegexp(html) + '$';
          return this.actual.match(new RegExp(expected));
        },
      });
    });

    it('should handle dangerouslySetInnerHTML', function() {
      var innerHTML = {__html: 'testContent'};
      expect(
        genMarkup({dangerouslySetInnerHTML: innerHTML})
      ).toHaveInnerhtml('testContent');
    });
  });

  describe('mountComponent', function() {
    var mountComponent;

    beforeEach(function() {
      mountComponent = function(props) {
        var container = document.createElement('div');
        ReactDOM.render(<div {...props} />, container);
      };
    });

    it('should not duplicate uppercased selfclosing tags', function() {
      var Container = React.createClass({
        render: function() {
          return React.createElement('BR', null);
        },
      });
      var returnedValue = ReactDOMServer.renderToString(<Container/>);
      expect(returnedValue).not.toContain('</BR>');
    });

    it('should warn against children for void elements', function() {
      spyOn(console, 'error');

      var container = document.createElement('div');

      ReactDOM.render(<input>children</input>, container);

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('void element');
    });

    it('should warn against dangerouslySetInnerHTML for void elements', function() {
      spyOn(console, 'error');

      var container = document.createElement('div');

      ReactDOM.render(
        <input dangerouslySetInnerHTML={{__html: 'content'}} />,
        container
      );

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('void element');
    });

    it('should treat menuitem as a void element but still create the closing tag', function() {
      spyOn(console, 'error');

      var container = document.createElement('div');

      var returnedValue = ReactDOMServer.renderToString(<menu><menuitem /></menu>);

      expect(returnedValue).toContain('</menuitem>');

      ReactDOM.render(<menu><menuitem>children</menuitem></menu>, container);

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('void element');
    });

    it('should validate against multiple children props', function() {
      expect(function() {
        mountComponent({children: '', dangerouslySetInnerHTML: ''});
      }).toThrow(
        'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
      );
    });

    it('should validate against use of innerHTML', function() {

      spyOn(console, 'error');
      mountComponent({innerHTML: '<span>Hi Jim!</span>'});
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain(
        'Directly setting property `innerHTML` is not permitted. '
      );
    });

    it('should validate use of dangerouslySetInnerHTML', function() {
      expect(function() {
        mountComponent({dangerouslySetInnerHTML: '<span>Hi Jim!</span>'});
      }).toThrow(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
        'Please visit https://fb.me/react-invariant-dangerously-set-inner-html for more information.'
      );
    });

    it('should validate use of dangerouslySetInnerHTML', function() {
      expect(function() {
        mountComponent({dangerouslySetInnerHTML: {foo: 'bar'} });
      }).toThrow(
        '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
        'Please visit https://fb.me/react-invariant-dangerously-set-inner-html for more information.'
      );
    });

    it('should allow {__html: null}', function() {
      expect(function() {
        mountComponent({dangerouslySetInnerHTML: {__html: null} });
      }).not.toThrow();
    });

    it('should warn about contentEditable and children', function() {
      spyOn(console, 'error');
      mountComponent({contentEditable: true, children: ''});
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('contentEditable');
    });

    it('should validate against invalid styles', function() {
      expect(function() {
        mountComponent({style: 'display: none'});
      }).toThrow(
        'The `style` prop expects a mapping from style properties to values, ' +
        'not a string. For example, style={{marginRight: spacing + \'em\'}} ' +
        'when using JSX.'
      );
    });

    it('should execute custom event plugin listening behavior', function() {
      var SimpleEventPlugin = require('SimpleEventPlugin');

      SimpleEventPlugin.didPutListener = jest.genMockFn();
      SimpleEventPlugin.willDeleteListener = jest.genMockFn();

      var container = document.createElement('div');
      ReactDOM.render(
        <div onClick={() => true} />,
        container
      );

      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(1);

      ReactDOM.unmountComponentAtNode(container);

      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(1);
    });

    it('should handle null and missing properly with event hooks', function() {
      var SimpleEventPlugin = require('SimpleEventPlugin');

      SimpleEventPlugin.didPutListener = jest.genMockFn();
      SimpleEventPlugin.willDeleteListener = jest.genMockFn();
      var container = document.createElement('div');

      ReactDOM.render(<div onClick={false} />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(0);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(0);

      ReactDOM.render(<div onClick={null} />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(0);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(0);

      ReactDOM.render(<div onClick={() => 'apple'} />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(1);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(0);

      ReactDOM.render(<div onClick={() => 'banana'} />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(2);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(0);

      ReactDOM.render(<div onClick={null} />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(2);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(1);

      ReactDOM.render(<div />, container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(2);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(1);

      ReactDOM.unmountComponentAtNode(container);
      expect(SimpleEventPlugin.didPutListener.mock.calls.length).toBe(2);
      expect(SimpleEventPlugin.willDeleteListener.mock.calls.length).toBe(1);
    });

    it('should warn for children on void elements', function() {
      spyOn(console, 'error');
      var X = React.createClass({
        render: function() {
          return <input>moo</input>;
        },
      });
      var container = document.createElement('div');
      ReactDOM.render(<X />, container);
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: input is a void element tag and must not have `children` ' +
        'or use `props.dangerouslySetInnerHTML`. Check the render method of X.'
      );
    });
  });

  describe('updateComponent', function() {
    var container;

    beforeEach(function() {
      container = document.createElement('div');
    });

    it('should warn against children for void elements', function() {
      spyOn(console, 'error');

      ReactDOM.render(<input />, container);
      ReactDOM.render(<input>children</input>, container);

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('void element');
    });

    it('should warn against dangerouslySetInnerHTML for void elements', function() {
      spyOn(console, 'error');

      ReactDOM.render(<input />, container);
      ReactDOM.render(
        <input dangerouslySetInnerHTML={{__html: 'content'}} />,
        container
      );

      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('void element');
    });

    it('should validate against multiple children props', function() {
      ReactDOM.render(<div></div>, container);

      expect(function() {
        ReactDOM.render(
          <div children="" dangerouslySetInnerHTML={{__html: ''}}></div>,
          container
        );
      }).toThrow(
        'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
      );
    });

    it('should warn about contentEditable and children', function() {
      spyOn(console, 'error');
      ReactDOM.render(
        <div contentEditable={true}><div /></div>,
        container
      );
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('contentEditable');
    });

    it('should validate against invalid styles', function() {
      ReactDOM.render(<div></div>, container);

      expect(function() {
        ReactDOM.render(<div style={1}></div>, container);
      }).toThrow(
        'The `style` prop expects a mapping from style properties to values, ' +
        'not a string. For example, style={{marginRight: spacing + \'em\'}} ' +
        'when using JSX.'
      );
    });

    it('should report component containing invalid styles', function() {
      var Animal = React.createClass({
        render: function() {
          return <div style={1}></div>;
        },
      });

      expect(function() {
        ReactDOM.render(<Animal/>, container);
      }).toThrow(
        'The `style` prop expects a mapping from style properties to values, ' +
        'not a string. For example, style={{marginRight: spacing + \'em\'}} ' +
        'when using JSX. This DOM node was rendered by `Animal`.'
      );
    });

    it('should properly escape text content and attributes values', function() {
      expect(
        ReactDOMServer.renderToStaticMarkup(
          React.DOM.div({
            title: '\'"<>&',
            style: {
              textAlign: '\'"<>&',
            },
          }, '\'"<>&')
        )
      ).toBe(
        '<div title="&#x27;&quot;&lt;&gt;&amp;" style="text-align:&#x27;&quot;&lt;&gt;&amp;;">' +
          '&#x27;&quot;&lt;&gt;&amp;' +
        '</div>'
      );
    });
  });

  describe('unmountComponent', function() {
    it('should clean up listeners', function() {
      var EventPluginHub = require('EventPluginHub');
      var ReactDOMComponentTree = require('ReactDOMComponentTree');

      var container = document.createElement('div');
      document.body.appendChild(container);

      var callback = function() {};
      var instance = <div onClick={callback} />;
      instance = ReactDOM.render(instance, container);

      var rootNode = ReactDOM.findDOMNode(instance);
      var inst = ReactDOMComponentTree.getInstanceFromNode(rootNode);
      expect(
        EventPluginHub.getListener(inst, 'onClick')
      ).toBe(callback);
      expect(rootNode).toBe(ReactDOM.findDOMNode(instance));

      ReactDOM.unmountComponentAtNode(container);

      expect(
        EventPluginHub.getListener(inst, 'onClick')
      ).toBe(undefined);
    });

    it('unmounts children before unsetting DOM node info', function() {
      var Inner = React.createClass({
        render: function() {
          return <span />;
        },
        componentWillUnmount: function() {
          // Should not throw
          expect(ReactDOM.findDOMNode(this).nodeName).toBe('SPAN');
        },
      });

      var container = document.createElement('div');
      ReactDOM.render(<div><Inner /></div>, container);
      ReactDOM.unmountComponentAtNode(container);
    });
  });

  describe('onScroll warning', function() {
    it('should warn about the `onScroll` issue when unsupported (IE8)', () => {
      // Mock this here so we can mimic IE8 support. We require isEventSupported
      // before React so it's pre-mocked before React would require it.
      jest.resetModuleRegistry()
        .mock('isEventSupported');
      var isEventSupported = require('isEventSupported');
      isEventSupported.mockReturnValueOnce(false);

      var ReactTestUtils = require('ReactTestUtils');

      spyOn(console, 'error');
      ReactTestUtils.renderIntoDocument(<div onScroll={function() {}} />);
      expect(console.error.calls.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: This browser doesn\'t support the `onScroll` event'
      );
    });
  });

  describe('tag sanitization', function() {
    it('should throw when an invalid tag name is used', () => {
      var ReactTestUtils = require('ReactTestUtils');
      var hackzor = React.createElement('script tag');
      expect(
        () => ReactTestUtils.renderIntoDocument(hackzor)
      ).toThrow(
        'Invalid tag: script tag'
      );
    });

    it('should throw when an attack vector is used', () => {
      var ReactTestUtils = require('ReactTestUtils');
      var hackzor = React.createElement('div><img /><div');
      expect(
        () => ReactTestUtils.renderIntoDocument(hackzor)
      ).toThrow(
        'Invalid tag: div><img /><div'
      );
    });
  });

  describe('nesting validation', function() {
    var ReactTestUtils;

    beforeEach(function() {
      ReactTestUtils = require('ReactTestUtils');
    });

    it('warns on invalid nesting', () => {
      spyOn(console, 'error');
      ReactTestUtils.renderIntoDocument(<div><tr /><tr /></div>);

      expect(console.error.calls.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: validateDOMNesting(...): <tr> cannot appear as a child of ' +
        '<div>. See div > tr.'
      );
    });

    it('warns on invalid nesting at root', () => {
      spyOn(console, 'error');
      var p = document.createElement('p');
      ReactDOM.render(<span><p /></span>, p);

      expect(console.error.calls.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: validateDOMNesting(...): <p> cannot appear as a descendant ' +
        'of <p>. See p > ... > p.'
      );
    });

    it('warns nicely for table rows', () => {
      spyOn(console, 'error');
      var Row = React.createClass({
        render: function() {
          return <tr />;
        },
      });
      var Foo = React.createClass({
        render: function() {
          return <table><Row /> </table>;
        },
      });
      ReactTestUtils.renderIntoDocument(<Foo />);

      expect(console.error.calls.length).toBe(2);
      expect(console.error.argsForCall[0][0]).toBe(
        'Warning: validateDOMNesting(...): <tr> cannot appear as a child of ' +
        '<table>. See Foo > table > Row > tr. Add a <tbody> to your code to ' +
        'match the DOM tree generated by the browser.'
      );
      expect(console.error.argsForCall[1][0]).toBe(
        'Warning: validateDOMNesting(...): <span> cannot appear as a child ' +
        'of <table>. See Foo > table > span.'
      );
    });

    it('gives useful context in warnings', () => {
      spyOn(console, 'error');
      var Row = React.createClass({
        render: () => <tr />,
      });
      var FancyRow = React.createClass({
        render: () => <Row />,
      });
      var Table = React.createClass({
        render: function() {
          return <table>{this.props.children}</table>;
        },
      });
      var FancyTable = React.createClass({
        render: function() {
          return <Table>{this.props.children}</Table>;
        },
      });

      var Viz1 = React.createClass({
        render: () => <table><FancyRow /></table>,
      });
      var App1 = React.createClass({
        render: () => <Viz1 />,
      });
      ReactTestUtils.renderIntoDocument(<App1 />);
      expect(console.error.calls.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain(
        'See Viz1 > table > FancyRow > Row > tr.'
      );

      var Viz2 = React.createClass({
        render: () => <FancyTable><FancyRow /></FancyTable>,
      });
      var App2 = React.createClass({
        render: () => <Viz2 />,
      });
      ReactTestUtils.renderIntoDocument(<App2 />);
      expect(console.error.calls.length).toBe(2);
      expect(console.error.argsForCall[1][0]).toContain(
        'See Viz2 > FancyTable > Table > table > FancyRow > Row > tr.'
      );

      ReactTestUtils.renderIntoDocument(<FancyTable><FancyRow /></FancyTable>);
      expect(console.error.calls.length).toBe(3);
      expect(console.error.argsForCall[2][0]).toContain(
        'See FancyTable > Table > table > FancyRow > Row > tr.'
      );

      ReactTestUtils.renderIntoDocument(<table><FancyRow /></table>);
      expect(console.error.calls.length).toBe(4);
      expect(console.error.argsForCall[3][0]).toContain(
        'See table > FancyRow > Row > tr.'
      );

      ReactTestUtils.renderIntoDocument(<FancyTable><tr /></FancyTable>);
      expect(console.error.calls.length).toBe(5);
      expect(console.error.argsForCall[4][0]).toContain(
        'See FancyTable > Table > table > tr.'
      );

      var Link = React.createClass({
        render: function() {
          return <a>{this.props.children}</a>;
        },
      });
      ReactTestUtils.renderIntoDocument(<Link><div><Link /></div></Link>);
      expect(console.error.calls.length).toBe(6);
      expect(console.error.argsForCall[5][0]).toContain(
        'See Link > a > ... > Link > a.'
      );
    });

    it('should warn about incorrect casing on properties', function() {
      spyOn(console, 'error');
      ReactDOMServer.renderToString(React.createElement('input', {type: 'text', tabindex: '1'}));
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('tabIndex');
    });

    it('should warn about incorrect casing on event handlers', function() {
      spyOn(console, 'error');
      ReactDOMServer.renderToString(React.createElement('input', {type: 'text', onclick: '1'}));
      ReactDOMServer.renderToString(React.createElement('input', {type: 'text', onKeydown: '1'}));
      expect(console.error.argsForCall.length).toBe(2);
      expect(console.error.argsForCall[0][0]).toContain('onClick');
      expect(console.error.argsForCall[1][0]).toContain('onKeyDown');
    });

    it('should warn about class', function() {
      spyOn(console, 'error');
      ReactDOMServer.renderToString(React.createElement('div', {class: 'muffins'}));
      expect(console.error.argsForCall.length).toBe(1);
      expect(console.error.argsForCall[0][0]).toContain('className');
    });
  });
});
