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
var ReactTestUtils;

function normalizeCodeLocInfo(str) {
  return str.replace(/\(at .+?:\d+\)/g, '(at **)');
}

describe('ReactComponent', function() {
  beforeEach(function() {
    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactTestUtils = require('ReactTestUtils');
  });

  it('should throw on invalid render targets', function() {
    var container = document.createElement('div');
    // jQuery objects are basically arrays; people often pass them in by mistake
    expect(function() {
      ReactDOM.render(<div></div>, [container]);
    }).toThrowError(
      '_registerComponent(...): Target container is not a DOM element.'
    );

    expect(function() {
      ReactDOM.render(<div></div>, null);
    }).toThrowError(
      '_registerComponent(...): Target container is not a DOM element.'
    );
  });

  it('should throw when supplying a ref outside of render method', function() {
    var instance = <div ref="badDiv" />;
    expect(function() {
      instance = ReactTestUtils.renderIntoDocument(instance);
    }).toThrow();
  });

  it('should warn when children are mutated before render', function() {
    spyOn(console, 'error');
    var children = [<span key={0} />, <span key={1} />, <span key={2} />];
    var element = <div>{children}</div>;
    children[1] = <p key={1} />; // Mutation is illegal
    ReactTestUtils.renderIntoDocument(element);
    expect(console.error.calls.count()).toBe(1);
    expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
      'Warning: Component\'s children should not be mutated.\n    in div (at **)'
    );
  });

  it('should warn when children are mutated', function() {
    spyOn(console, 'error');
    var children = [<span key={0} />, <span key={1} />, <span key={2} />];
    function Wrapper(props) {
      props.children[1] = <p key={1} />; // Mutation is illegal
      return <div>{props.children}</div>;
    }
    ReactTestUtils.renderIntoDocument(<Wrapper>{children}</Wrapper>);
    expect(console.error.calls.count()).toBe(1);
    expect(normalizeCodeLocInfo(console.error.calls.argsFor(0)[0])).toBe(
      'Warning: Component\'s children should not be mutated.\n    in Wrapper (at **)'
    );
  });

  it('should support refs on owned components', function() {
    var innerObj = {};
    var outerObj = {};

    class Wrapper extends React.Component {
      getObject = () => {
        return this.props.object;
      };

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    class Component extends React.Component {
      render() {
        var inner = <Wrapper object={innerObj} ref="inner" />;
        var outer = <Wrapper object={outerObj} ref="outer">{inner}</Wrapper>;
        return outer;
      }

      componentDidMount() {
        expect(this.refs.inner.getObject()).toEqual(innerObj);
        expect(this.refs.outer.getObject()).toEqual(outerObj);
      }
    }

    var instance = <Component />;
    instance = ReactTestUtils.renderIntoDocument(instance);
  });

  it('should not have refs on unmounted components', function() {
    class Parent extends React.Component {
      render() {
        return <Child><div ref="test" /></Child>;
      }

      componentDidMount() {
        expect(this.refs && this.refs.test).toEqual(undefined);
      }
    }

    class Child extends React.Component {
      render() {
        return <div />;
      }
    }

    var instance = <Parent child={<span />} />;
    instance = ReactTestUtils.renderIntoDocument(instance);
  });

  it('should support new-style refs', function() {
    var innerObj = {};
    var outerObj = {};

    class Wrapper extends React.Component {
      getObject = () => {
        return this.props.object;
      };

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    var mounted = false;

    class Component extends React.Component {
      render() {
        var inner = <Wrapper object={innerObj} ref={(c) => this.innerRef = c} />;
        var outer = (
          <Wrapper object={outerObj} ref={(c) => this.outerRef = c}>
            {inner}
          </Wrapper>
        );
        return outer;
      }

      componentDidMount() {
        expect(this.innerRef.getObject()).toEqual(innerObj);
        expect(this.outerRef.getObject()).toEqual(outerObj);
        mounted = true;
      }
    }

    var instance = <Component />;
    instance = ReactTestUtils.renderIntoDocument(instance);
    expect(mounted).toBe(true);
  });

  it('should support new-style refs with mixed-up owners', function() {
    class Wrapper extends React.Component {
      getTitle = () => {
        return this.props.title;
      };

      render() {
        return this.props.getContent();
      }
    }

    var mounted = false;

    class Component extends React.Component {
      getInner = () => {
        // (With old-style refs, it's impossible to get a ref to this div
        // because Wrapper is the current owner when this function is called.)
        return <div title="inner" ref={(c) => this.innerRef = c} />;
      };

      render() {
        return (
          <Wrapper
            title="wrapper"
            ref={(c) => this.wrapperRef = c}
            getContent={this.getInner}
            />
        );
      }

      componentDidMount() {
        // Check .props.title to make sure we got the right elements back
        expect(this.wrapperRef.getTitle()).toBe('wrapper');
        expect(ReactDOM.findDOMNode(this.innerRef).title).toBe('inner');
        mounted = true;
      }
    }

    var instance = <Component />;
    instance = ReactTestUtils.renderIntoDocument(instance);
    expect(mounted).toBe(true);
  });

  it('should call refs at the correct time', function() {
    var log = [];

    class Inner extends React.Component {
      render() {
        log.push(`inner ${this.props.id} render`);
        return <div />;
      }

      componentDidMount() {
        log.push(`inner ${this.props.id} componentDidMount`);
      }

      componentDidUpdate() {
        log.push(`inner ${this.props.id} componentDidUpdate`);
      }

      componentWillUnmount() {
        log.push(`inner ${this.props.id} componentWillUnmount`);
      }
    }

    class Outer extends React.Component {
      render() {
        return (
          <div>
            <Inner id={1} ref={(c) => {
              log.push(`ref 1 got ${c ? `instance ${c.props.id}` : 'null'}`);
            }}/>
            <Inner id={2} ref={(c) => {
              log.push(`ref 2 got ${c ? `instance ${c.props.id}` : 'null'}`);
            }}/>
          </div>
        );
      }

      componentDidMount() {
        log.push('outer componentDidMount');
      }

      componentDidUpdate() {
        log.push('outer componentDidUpdate');
      }

      componentWillUnmount() {
        log.push('outer componentWillUnmount');
      }
    }

    // mount, update, unmount
    var el = document.createElement('div');
    log.push('start mount');
    ReactDOM.render(<Outer />, el);
    log.push('start update');
    ReactDOM.render(<Outer />, el);
    log.push('start unmount');
    ReactDOM.unmountComponentAtNode(el);

    /* eslint-disable indent */
    expect(log).toEqual([
      'start mount',
        'inner 1 render',
        'inner 2 render',
        'inner 1 componentDidMount',
        'ref 1 got instance 1',
        'inner 2 componentDidMount',
        'ref 2 got instance 2',
        'outer componentDidMount',
      'start update',
        // Previous (equivalent) refs get cleared
        'ref 1 got null',
        'inner 1 render',
        'ref 2 got null',
        'inner 2 render',
        'inner 1 componentDidUpdate',
        'ref 1 got instance 1',
        'inner 2 componentDidUpdate',
        'ref 2 got instance 2',
        'outer componentDidUpdate',
      'start unmount',
        'outer componentWillUnmount',
        'ref 1 got null',
        'inner 1 componentWillUnmount',
        'ref 2 got null',
        'inner 2 componentWillUnmount',
    ]);
    /* eslint-enable indent */
  });

  it('fires the callback after a component is rendered', function() {
    var callback = jest.fn();
    var container = document.createElement('div');
    ReactDOM.render(<div />, container, callback);
    expect(callback.mock.calls.length).toBe(1);
    ReactDOM.render(<div className="foo" />, container, callback);
    expect(callback.mock.calls.length).toBe(2);
    ReactDOM.render(<span />, container, callback);
    expect(callback.mock.calls.length).toBe(3);
  });

  it('throws usefully when rendering badly-typed elements', function() {
    spyOn(console, 'error');

    var X = undefined;
    expect(() => ReactTestUtils.renderIntoDocument(<X />)).toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
      'or a class/function (for composite components) but got: undefined.'
    );

    var Y = null;
    expect(() => ReactTestUtils.renderIntoDocument(<Y />)).toThrowError(
      'Element type is invalid: expected a string (for built-in components) ' +
      'or a class/function (for composite components) but got: null.'
    );

    // One warning for each element creation
    expect(console.error.calls.count()).toBe(2);
  });

});
