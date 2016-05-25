/**
 * Copyright 2014-present, Facebook, Inc.
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
var ReactTestUtils;
var TogglingComponent;

var reactComponentExpect;

var log;

describe('ReactEmptyComponent', function() {
  beforeEach(function() {
    jest.resetModuleRegistry();

    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactTestUtils = require('ReactTestUtils');

    reactComponentExpect = require('reactComponentExpect');

    log = jasmine.createSpy();

    TogglingComponent = React.createClass({
      getInitialState: function() {
        return {component: this.props.firstComponent};
      },
      componentDidMount: function() {
        log(ReactDOM.findDOMNode(this));
        this.setState({component: this.props.secondComponent});
      },
      componentDidUpdate: function() {
        log(ReactDOM.findDOMNode(this));
      },
      render: function() {
        var Component = this.state.component;
        return Component ? <Component /> : null;
      },
    });
  });

  it('should render null and false as a noscript tag under the hood', () => {
    var Component1 = React.createClass({
      render: function() {
        return null;
      },
    });
    var Component2 = React.createClass({
      render: function() {
        return false;
      },
    });

    var instance1 = ReactTestUtils.renderIntoDocument(<Component1 />);
    var instance2 = ReactTestUtils.renderIntoDocument(<Component2 />);
    reactComponentExpect(instance1)
      .expectRenderedChild()
      .toBeEmptyComponent();
    reactComponentExpect(instance2)
      .expectRenderedChild()
      .toBeEmptyComponent();
  });

  it('should still throw when rendering to undefined', () => {
    var Component = React.createClass({
      render: function() {},
    });
    expect(function() {
      ReactTestUtils.renderIntoDocument(<Component />);
    }).toThrowError(
      'Component.render(): A valid React element (or null) must be returned. You may ' +
      'have returned undefined, an array or some other invalid object.'
    );
  });

  it('should be able to switch between rendering null and a normal tag', () => {
    var instance1 =
      <TogglingComponent
        firstComponent={null}
        secondComponent={'div'}
      />;
    var instance2 =
      <TogglingComponent
        firstComponent={'div'}
        secondComponent={null}
      />;

    ReactTestUtils.renderIntoDocument(instance1);
    ReactTestUtils.renderIntoDocument(instance2);

    expect(log.calls.count()).toBe(4);
    expect(log.calls.argsFor(0)[0]).toBe(null);
    expect(log.calls.argsFor(1)[0].tagName).toBe('DIV');
    expect(log.calls.argsFor(2)[0].tagName).toBe('DIV');
    expect(log.calls.argsFor(3)[0]).toBe(null);
  });

  it('should be able to switch in a list of children', () => {
    var instance1 =
      <TogglingComponent
        firstComponent={null}
        secondComponent={'div'}
      />;

    ReactTestUtils.renderIntoDocument(
      <div>
        {instance1}
        {instance1}
        {instance1}
      </div>
    );

    expect(log.calls.count()).toBe(6);
    expect(log.calls.argsFor(0)[0]).toBe(null);
    expect(log.calls.argsFor(1)[0]).toBe(null);
    expect(log.calls.argsFor(2)[0]).toBe(null);
    expect(log.calls.argsFor(3)[0].tagName).toBe('DIV');
    expect(log.calls.argsFor(4)[0].tagName).toBe('DIV');
    expect(log.calls.argsFor(5)[0].tagName).toBe('DIV');
  });

  it('should distinguish between a script placeholder and an actual script tag',
    () => {
      var instance1 =
        <TogglingComponent
          firstComponent={null}
          secondComponent={'script'}
        />;
      var instance2 =
        <TogglingComponent
          firstComponent={'script'}
          secondComponent={null}
        />;

      expect(function() {
        ReactTestUtils.renderIntoDocument(instance1);
      }).not.toThrow();
      expect(function() {
        ReactTestUtils.renderIntoDocument(instance2);
      }).not.toThrow();

      expect(log.calls.count()).toBe(4);
      expect(log.calls.argsFor(0)[0]).toBe(null);
      expect(log.calls.argsFor(1)[0].tagName).toBe('SCRIPT');
      expect(log.calls.argsFor(2)[0].tagName).toBe('SCRIPT');
      expect(log.calls.argsFor(3)[0]).toBe(null);
    }
  );

  it('should have findDOMNode return null when multiple layers of composite ' +
    'components render to the same null placeholder',
    () => {
      var GrandChild = React.createClass({
        render: function() {
          return null;
        },
      });

      var Child = React.createClass({
        render: function() {
          return <GrandChild />;
        },
      });

      var instance1 =
        <TogglingComponent
          firstComponent={'div'}
          secondComponent={Child}
        />;
      var instance2 =
        <TogglingComponent
          firstComponent={Child}
          secondComponent={'div'}
        />;

      expect(function() {
        ReactTestUtils.renderIntoDocument(instance1);
      }).not.toThrow();
      expect(function() {
        ReactTestUtils.renderIntoDocument(instance2);
      }).not.toThrow();

      expect(log.calls.count()).toBe(4);
      expect(log.calls.argsFor(0)[0].tagName).toBe('DIV');
      expect(log.calls.argsFor(1)[0]).toBe(null);
      expect(log.calls.argsFor(2)[0]).toBe(null);
      expect(log.calls.argsFor(3)[0].tagName).toBe('DIV');
    }
  );

  it('works when switching components', function() {
    var assertions = 0;
    var Inner = React.createClass({
      render: function() {
        return <span />;
      },
      componentDidMount: function() {
        // Make sure the DOM node resolves properly even if we're replacing a
        // `null` component
        expect(ReactDOM.findDOMNode(this)).not.toBe(null);
        assertions++;
      },
      componentWillUnmount: function() {
        // Even though we're getting replaced by `null`, we haven't been
        // replaced yet!
        expect(ReactDOM.findDOMNode(this)).not.toBe(null);
        assertions++;
      },
    });
    var Wrapper = React.createClass({
      render: function() {
        return this.props.showInner ? <Inner /> : null;
      },
    });

    var el = document.createElement('div');
    var component;

    // Render the <Inner /> component...
    component = ReactDOM.render(<Wrapper showInner={true} />, el);
    expect(ReactDOM.findDOMNode(component)).not.toBe(null);

    // Switch to null...
    component = ReactDOM.render(<Wrapper showInner={false} />, el);
    expect(ReactDOM.findDOMNode(component)).toBe(null);

    // ...then switch back.
    component = ReactDOM.render(<Wrapper showInner={true} />, el);
    expect(ReactDOM.findDOMNode(component)).not.toBe(null);

    expect(assertions).toBe(3);
  });

  it('throws when rendering null at the top level', function() {
    // TODO: This should actually work since `null` is a valid ReactNode
    var div = document.createElement('div');
    expect(function() {
      ReactDOM.render(null, div);
    }).toThrowError(
      'ReactDOM.render(): Invalid component element.'
    );
  });

  it('does not break when updating during mount', function() {
    var Child = React.createClass({
      componentDidMount() {
        if (this.props.onMount) {
          this.props.onMount();
        }
      },
      render() {
        if (!this.props.visible) {
          return null;
        }

        return <div>hello world</div>;
      },
    });

    var Parent = React.createClass({
      update() {
        this.forceUpdate();
      },
      render() {
        return (
          <div>
            <Child key="1" visible={false} />
            <Child key="0" visible={true} onMount={this.update} />
            <Child key="2" visible={false} />
          </div>
        );
      },
    });

    expect(function() {
      ReactTestUtils.renderIntoDocument(<Parent />);
    }).not.toThrow();
  });

  it('preserves the dom node during updates', function() {
    var Empty = React.createClass({
      render: function() {
        return null;
      },
    });

    var container = document.createElement('div');

    ReactDOM.render(<Empty />, container);
    var noscript1 = container.firstChild;
    expect(noscript1.nodeName).toBe('#comment');

    // This update shouldn't create a DOM node
    ReactDOM.render(<Empty />, container);
    var noscript2 = container.firstChild;
    expect(noscript2.nodeName).toBe('#comment');

    expect(noscript1).toBe(noscript2);
  });
});
