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

var React = require('React');
var ReactDOM = require('ReactDOM');
var ReactDOMFeatureFlags = require('ReactDOMFeatureFlags');

describe('ReactDOMFiber', () => {
  var container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should render strings as children', () => {
    const Box = ({value}) => <div>{value}</div>;

    ReactDOM.render(
      <Box value="foo" />,
      container
    );
    expect(container.textContent).toEqual('foo');
  });

  it('should render numbers as children', () => {
    const Box = ({value}) => <div>{value}</div>;

    ReactDOM.render(
      <Box value={10} />,
      container
    );

    expect(container.textContent).toEqual('10');
  });

  it('should be called a callback argument', () => {
    // mounting phase
    let called = false;
    ReactDOM.render(
      <div>Foo</div>,
      container,
      () => called = true
    );
    expect(called).toEqual(true);

    // updating phase
    called = false;
    ReactDOM.render(
      <div>Foo</div>,
      container,
      () => called = true
    );
    expect(called).toEqual(true);
  });

  if (ReactDOMFeatureFlags.useFiber) {
    it('should render a component returning strings directly from render', () => {
      const Text = ({value}) => value;

      ReactDOM.render(
        <Text value="foo" />,
        container
      );
      expect(container.textContent).toEqual('foo');
    });

    it('should render a component returning numbers directly from render', () => {
      const Text = ({value}) => value;

      ReactDOM.render(
        <Text value={10} />,
        container
      );

      expect(container.textContent).toEqual('10');
    });

    it('finds the DOM Text node of a string child', () => {
      class Text extends React.Component {
        render() {
          return this.props.value;
        }
      }

      let instance = null;
      ReactDOM.render(
        <Text value="foo" ref={ref => instance = ref} />,
        container
      );

      const textNode = ReactDOM.findDOMNode(instance);
      expect(textNode).toBe(container.firstChild);
      expect(textNode.nodeType).toBe(3);
      expect(textNode.nodeValue).toBe('foo');
    });

    it('finds the first child when a component returns a fragment', () => {
      class Fragment extends React.Component {
        render() {
          return [
            <div />,
            <span />,
          ];
        }
      }

      let instance = null;
      ReactDOM.render(
        <Fragment ref={ref => instance = ref} />,
        container
      );

      expect(container.childNodes.length).toBe(2);

      const firstNode = ReactDOM.findDOMNode(instance);
      expect(firstNode).toBe(container.firstChild);
      expect(firstNode.tagName).toBe('DIV');
    });

    it('finds the first child even when fragment is nested', () => {
      class Wrapper extends React.Component {
        render() {
          return this.props.children;
        }
      }

      class Fragment extends React.Component {
        render() {
          return [
            <Wrapper><div /></Wrapper>,
            <span />,
          ];
        }
      }

      let instance = null;
      ReactDOM.render(
        <Fragment ref={ref => instance = ref} />,
        container
      );

      expect(container.childNodes.length).toBe(2);

      const firstNode = ReactDOM.findDOMNode(instance);
      expect(firstNode).toBe(container.firstChild);
      expect(firstNode.tagName).toBe('DIV');
    });

    it('finds the first child even when first child renders null', () => {
      class NullComponent extends React.Component {
        render() {
          return null;
        }
      }

      class Fragment extends React.Component {
        render() {
          return [
            <NullComponent />,
            <div />,
            <span />,
          ];
        }
      }

      let instance = null;
      ReactDOM.render(
        <Fragment ref={ref => instance = ref} />,
        container
      );

      expect(container.childNodes.length).toBe(2);

      const firstNode = ReactDOM.findDOMNode(instance);
      expect(firstNode).toBe(container.firstChild);
      expect(firstNode.tagName).toBe('DIV');
    });
  }

  if (ReactDOMFeatureFlags.useFiber) {
    it('should render portal children', () => {
      var portalContainer1 = document.createElement('div');
      var portalContainer2 = document.createElement('div');

      var ops = [];
      class Child extends React.Component {
        componentDidMount() {
          ops.push(`${this.props.name} componentDidMount`);
        }
        componentDidUpdate() {
          ops.push(`${this.props.name} componentDidUpdate`);
        }
        componentWillUnmount() {
          ops.push(`${this.props.name} componentWillUnmount`);
        }
        render() {
          return <div>{this.props.name}</div>;
        }
      }

      class Parent extends React.Component {
        componentDidMount() {
          ops.push(`Parent:${this.props.step} componentDidMount`);
        }
        componentDidUpdate() {
          ops.push(`Parent:${this.props.step} componentDidUpdate`);
        }
        componentWillUnmount() {
          ops.push(`Parent:${this.props.step} componentWillUnmount`);
        }
        render() {
          const {step} = this.props;
          return [
            <Child name={`normal[0]:${step}`} />,
            ReactDOM.unstable_createPortal(
              <Child name={`portal1[0]:${step}`} />,
              portalContainer1
            ),
            <Child name={`normal[1]:${step}`} />,
            ReactDOM.unstable_createPortal(
              [
                <Child name={`portal2[0]:${step}`} />,
                <Child name={`portal2[1]:${step}`} />,
              ],
              portalContainer2
            ),
          ];
        }
      }

      ReactDOM.render(<Parent step="a" />, container);
      expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:a</div>');
      expect(portalContainer2.innerHTML).toBe('<div>portal2[0]:a</div><div>portal2[1]:a</div>');
      expect(container.innerHTML).toBe('<div>normal[0]:a</div><div>normal[1]:a</div>');
      expect(ops).toEqual([
        'normal[0]:a componentDidMount',
        'portal1[0]:a componentDidMount',
        'normal[1]:a componentDidMount',
        'portal2[0]:a componentDidMount',
        'portal2[1]:a componentDidMount',
        'Parent:a componentDidMount',
      ]);

      ops.length = 0;
      ReactDOM.render(<Parent step="b" />, container);
      expect(portalContainer1.innerHTML).toBe('<div>portal1[0]:b</div>');
      expect(portalContainer2.innerHTML).toBe('<div>portal2[0]:b</div><div>portal2[1]:b</div>');
      expect(container.innerHTML).toBe('<div>normal[0]:b</div><div>normal[1]:b</div>');
      expect(ops).toEqual([
        'normal[0]:b componentDidUpdate',
        'portal1[0]:b componentDidUpdate',
        'normal[1]:b componentDidUpdate',
        'portal2[0]:b componentDidUpdate',
        'portal2[1]:b componentDidUpdate',
        'Parent:b componentDidUpdate',
      ]);

      ops.length = 0;
      ReactDOM.unmountComponentAtNode(container);
      expect(portalContainer1.innerHTML).toBe('');
      expect(portalContainer2.innerHTML).toBe('');
      expect(container.innerHTML).toBe('');
      expect(ops).toEqual([
        'Parent:b componentWillUnmount',
        'normal[0]:b componentWillUnmount',
        'portal1[0]:b componentWillUnmount',
        'normal[1]:b componentWillUnmount',
        'portal2[0]:b componentWillUnmount',
        'portal2[1]:b componentWillUnmount',
      ]);
    });

    it('should pass portal context when rendering subtree elsewhere', () => {
      var portalContainer = document.createElement('div');

      class Component extends React.Component {
        static contextTypes = {
          foo: React.PropTypes.string.isRequired,
        };

        render() {
          return <div>{this.context.foo}</div>;
        }
      }

      class Parent extends React.Component {
        static childContextTypes = {
          foo: React.PropTypes.string.isRequired,
        };

        getChildContext() {
          return {
            foo: 'bar',
          };
        }

        render() {
          return ReactDOM.unstable_createPortal(
            <Component />,
            portalContainer
          );
        }
      }

      ReactDOM.render(<Parent />, container);
      expect(container.innerHTML).toBe('');
      expect(portalContainer.innerHTML).toBe('<div>bar</div>');
    });

    it('should update portal context if it changes due to setState', () => {
      var portalContainer = document.createElement('div');

      class Component extends React.Component {
        static contextTypes = {
          foo: React.PropTypes.string.isRequired,
          getFoo: React.PropTypes.func.isRequired,
        };

        render() {
          return <div>{this.context.foo + '-' + this.context.getFoo()}</div>;
        }
      }

      class Parent extends React.Component {
        static childContextTypes = {
          foo: React.PropTypes.string.isRequired,
          getFoo: React.PropTypes.func.isRequired,
        };

        state = {
          bar: 'initial',
        };

        getChildContext() {
          return {
            foo: this.state.bar,
            getFoo: () => this.state.bar,
          };
        }

        render() {
          return ReactDOM.unstable_createPortal(
            <Component />,
            portalContainer
          );
        }
      }

      var instance = ReactDOM.render(<Parent />, container);
      expect(portalContainer.innerHTML).toBe('<div>initial-initial</div>');
      expect(container.innerHTML).toBe('');
      instance.setState({bar: 'changed'});
      expect(portalContainer.innerHTML).toBe('<div>changed-changed</div>');
      expect(container.innerHTML).toBe('');
    });

    it('should update portal context if it changes due to re-render', () => {
      var portalContainer = document.createElement('div');

      class Component extends React.Component {
        static contextTypes = {
          foo: React.PropTypes.string.isRequired,
          getFoo: React.PropTypes.func.isRequired,
        };

        render() {
          return <div>{this.context.foo + '-' + this.context.getFoo()}</div>;
        }
      }

      class Parent extends React.Component {
        static childContextTypes = {
          foo: React.PropTypes.string.isRequired,
          getFoo: React.PropTypes.func.isRequired,
        };

        getChildContext() {
          return {
            foo: this.props.bar,
            getFoo: () => this.props.bar,
          };
        }

        render() {
          return ReactDOM.unstable_createPortal(
            <Component />,
            portalContainer
          );
        }
      }

      ReactDOM.render(<Parent bar="initial" />, container);
      expect(portalContainer.innerHTML).toBe('<div>initial-initial</div>');
      expect(container.innerHTML).toBe('');
      ReactDOM.render(<Parent bar="changed" />, container);
      expect(portalContainer.innerHTML).toBe('<div>changed-changed</div>');
      expect(container.innerHTML).toBe('');
    });
  }
});
