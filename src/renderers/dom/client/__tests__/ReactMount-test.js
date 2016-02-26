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

var React;
var ReactDOM;
var ReactDOMServer;
var ReactMount;
var ReactTestUtils;
var WebComponents;

describe('ReactMount', function() {
  beforeEach(function() {
    jest.resetModuleRegistry();

    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMServer = require('ReactDOMServer');
    ReactMount = require('ReactMount');
    ReactTestUtils = require('ReactTestUtils');

    try {
      if (WebComponents === undefined && typeof jest !== 'undefined') {
        WebComponents = require('WebComponents');
      }
    } catch (e) {
      // Parse error expected on engines that don't support setters
      // or otherwise aren't supportable by the polyfill.
      // Leave WebComponents undefined.
    }
  });

  describe('unmountComponentAtNode', function() {
    it('throws when given a non-node', function() {
      var nodeArray = document.getElementsByTagName('div');
      expect(function() {
        ReactDOM.unmountComponentAtNode(nodeArray);
      }).toThrow(
        'unmountComponentAtNode(...): Target container is not a DOM element.'
      );
    });
  });

  it('throws when given a string', function() {
    expect(function() {
      ReactTestUtils.renderIntoDocument('div');
    }).toThrow(
      'ReactDOM.render(): Invalid component element. Instead of passing a ' +
      'string like \'div\', pass React.createElement(\'div\') or <div />.'
    );
  });

  it('throws when given a factory', function() {
    var Component = React.createClass({
      render: function() {
        return <div />;
      },
    });
    expect(function() {
      ReactTestUtils.renderIntoDocument(Component);
    }).toThrow(
      'ReactDOM.render(): Invalid component element. Instead of passing a ' +
      'class like Foo, pass React.createElement(Foo) or <Foo />.'
    );
  });

  it('should render different components in same root', function() {
    var container = document.createElement('container');
    document.body.appendChild(container);

    ReactMount.render(<div></div>, container);
    expect(container.firstChild.nodeName).toBe('DIV');

    ReactMount.render(<span></span>, container);
    expect(container.firstChild.nodeName).toBe('SPAN');
  });

  it('should unmount and remount if the key changes', function() {
    var container = document.createElement('container');

    var mockMount = jest.genMockFn();
    var mockUnmount = jest.genMockFn();

    var Component = React.createClass({
      componentDidMount: mockMount,
      componentWillUnmount: mockUnmount,
      render: function() {
        return <span>{this.props.text}</span>;
      },
    });

    expect(mockMount.mock.calls.length).toBe(0);
    expect(mockUnmount.mock.calls.length).toBe(0);

    ReactMount.render(<Component text="orange" key="A" />, container);
    expect(container.firstChild.innerHTML).toBe('orange');
    expect(mockMount.mock.calls.length).toBe(1);
    expect(mockUnmount.mock.calls.length).toBe(0);

    // If we change the key, the component is unmounted and remounted
    ReactMount.render(<Component text="green" key="B" />, container);
    expect(container.firstChild.innerHTML).toBe('green');
    expect(mockMount.mock.calls.length).toBe(2);
    expect(mockUnmount.mock.calls.length).toBe(1);

    // But if we don't change the key, the component instance is reused
    ReactMount.render(<Component text="blue" key="B" />, container);
    expect(container.firstChild.innerHTML).toBe('blue');
    expect(mockMount.mock.calls.length).toBe(2);
    expect(mockUnmount.mock.calls.length).toBe(1);
  });

  it('should reuse markup if rendering to the same target twice', function() {
    var container = document.createElement('container');
    var instance1 = ReactDOM.render(<div />, container);
    var instance2 = ReactDOM.render(<div />, container);

    expect(instance1 === instance2).toBe(true);
  });

  it('should warn if mounting into dirty rendered markup', function() {
    var container = document.createElement('container');
    container.innerHTML = ReactDOMServer.renderToString(<div />) + ' ';

    spyOn(console, 'error');
    ReactMount.render(<div />, container);
    expect(console.error.calls.length).toBe(1);

    container.innerHTML = ' ' + ReactDOMServer.renderToString(<div />);

    ReactMount.render(<div />, container);
    expect(console.error.calls.length).toBe(2);
  });

  it('should not warn if mounting into non-empty node', function() {
    var container = document.createElement('container');
    container.innerHTML = '<div></div>';

    spyOn(console, 'error');
    ReactMount.render(<div />, container);
    expect(console.error.calls.length).toBe(0);
  });

  it('should warn when mounting into document.body', function() {
    var iFrame = document.createElement('iframe');
    document.body.appendChild(iFrame);
    spyOn(console, 'error');

    ReactMount.render(<div />, iFrame.contentDocument.body);

    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      'Rendering components directly into document.body is discouraged'
    );
  });

  it('should account for escaping on a checksum mismatch', function() {
    var div = document.createElement('div');
    var markup = ReactDOMServer.renderToString(
      <div>This markup contains an nbsp entity: &nbsp; server text</div>);
    div.innerHTML = markup;

    spyOn(console, 'error');
    ReactDOM.render(
      <div>This markup contains an nbsp entity: &nbsp; client text</div>,
      div
    );
    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      ' (client) nbsp entity: &nbsp; client text</div>\n' +
      ' (server) nbsp entity: &nbsp; server text</div>'
    );
  });

  if (WebComponents !== undefined) {
    it('should allow mounting/unmounting to document fragment container', function() {
      var shadowRoot;
      var proto = Object.create(HTMLElement.prototype, {
        createdCallback: {
          value: function() {
            shadowRoot = this.createShadowRoot();
            ReactDOM.render(<div>Hi, from within a WC!</div>, shadowRoot);
            expect(shadowRoot.firstChild.tagName).toBe('DIV');
            ReactDOM.render(<span>Hi, from within a WC!</span>, shadowRoot);
            expect(shadowRoot.firstChild.tagName).toBe('SPAN');
          },
        },
      });
      proto.unmount = function() {
        ReactDOM.unmountComponentAtNode(shadowRoot);
      };
      document.registerElement('x-foo', {prototype: proto});
      var element = document.createElement('x-foo');
      element.unmount();
    });
  }

  it('should warn if render removes React-rendered children', function() {
    var container = document.createElement('container');
    var Component = React.createClass({
      render: function() {
        return <div><div /></div>;
      },
    });
    ReactDOM.render(<Component />, container);

    // Test that blasting away children throws a warning
    spyOn(console, 'error');
    var rootNode = container.firstChild;
    ReactDOM.render(<span />, rootNode);
    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toBe(
      'Warning: render(...): Replacing React-rendered children with a new ' +
      'root component. If you intended to update the children of this node, ' +
      'you should instead have the existing children update their state and ' +
      'render the new components instead of calling ReactDOM.render.'
    );
  });

  it('passes the correct callback context', function() {
    var container = document.createElement('div');
    var calls = 0;

    ReactDOM.render(<div />, container, function() {
      expect(this.nodeName).toBe('DIV');
      calls++;
    });

    // Update, no type change
    ReactDOM.render(<div />, container, function() {
      expect(this.nodeName).toBe('DIV');
      calls++;
    });

    // Update, type change
    ReactDOM.render(<span />, container, function() {
      expect(this.nodeName).toBe('SPAN');
      calls++;
    });

    // Batched update, no type change
    ReactDOM.unstable_batchedUpdates(function() {
      ReactDOM.render(<span />, container, function() {
        expect(this.nodeName).toBe('SPAN');
        calls++;
      });
    });

    // Batched update, type change
    ReactDOM.unstable_batchedUpdates(function() {
      ReactDOM.render(<article />, container, function() {
        expect(this.nodeName).toBe('ARTICLE');
        calls++;
      });
    });

    expect(calls).toBe(5);
  });

  it('tracks root instances', function() {
    // Used by devtools.
    expect(Object.keys(ReactMount._instancesByReactRootID).length).toBe(0);
    ReactTestUtils.renderIntoDocument(<span />);
    expect(Object.keys(ReactMount._instancesByReactRootID).length).toBe(1);
    var container = document.createElement('div');
    ReactDOM.render(<span />, container);
    expect(Object.keys(ReactMount._instancesByReactRootID).length).toBe(2);
    ReactDOM.unmountComponentAtNode(container);
    expect(Object.keys(ReactMount._instancesByReactRootID).length).toBe(1);
  });

  it('marks top-level mounts', function() {
    var ReactFeatureFlags = require('ReactFeatureFlags');

    var Foo = React.createClass({
      render: function() {
        return <Bar />;
      },
    });

    var Bar = React.createClass({
      render: function() {
        return <div />;
      },
    });

    try {
      ReactFeatureFlags.logTopLevelRenders = true;
      spyOn(console, 'time');
      spyOn(console, 'timeEnd');

      ReactTestUtils.renderIntoDocument(<Foo />);

      expect(console.time.argsForCall.length).toBe(1);
      expect(console.time.argsForCall[0][0]).toBe('React mount: Foo');
      expect(console.timeEnd.argsForCall.length).toBe(1);
      expect(console.timeEnd.argsForCall[0][0]).toBe('React mount: Foo');
    } finally {
      ReactFeatureFlags.logTopLevelRenders = false;
    }
  });
});
