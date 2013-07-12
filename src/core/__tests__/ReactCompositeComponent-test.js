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
 * @jsx React.DOM
 * @emails react-core
 */

"use strict";

var MorphingComponent;
var ChildUpdates;
var React;
var ReactCurrentOwner;
var ReactPropTypes;
var ReactTestUtils;
var ReactID;
var ReactDoNotBindDeprecated;

var cx;
var reactComponentExpect;

describe('ReactCompositeComponent', function() {

  beforeEach(function() {
    cx = require('cx');
    reactComponentExpect = require('reactComponentExpect');
    React = require('React');
    ReactCurrentOwner = require('ReactCurrentOwner');
    ReactDoNotBindDeprecated = require('ReactDoNotBindDeprecated');
    ReactPropTypes = require('ReactPropTypes');
    ReactTestUtils = require('ReactTestUtils');
    ReactID = require('ReactID');

    MorphingComponent = React.createClass({
      getInitialState: function() {
        return {activated: false};
      },

      _toggleActivatedState: function() {
        this.setState({activated: !this.state.activated});
      },

      render: function() {
        var toggleActivatedState = this._toggleActivatedState;
        return !this.state.activated ?
          <a ref="x" onClick={toggleActivatedState} /> :
          <b ref="x" onClick={toggleActivatedState} />;
      }
    });

    /**
     * We'll use this to ensure that an old version is not cached when it is
     * reallocated again.
     */
    ChildUpdates = React.createClass({
      getAnchorID: function() {
        return this.refs.anch._rootNodeID;
      },
      render: function() {
        var className = cx({'anchorClass': this.props.anchorClassOn});
        return this.props.renderAnchor ?
          <a ref="anch" className={className}></a> :
          <b></b>;
      }
    });
  });

  it('should support rendering to different child types over time', function() {
    var instance = <MorphingComponent />;
    ReactTestUtils.renderIntoDocument(instance);

    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('a');

    instance._toggleActivatedState();
    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('b');

    instance._toggleActivatedState();
    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('a');
  });

  it('should react to state changes from callbacks', function() {
    var instance = <MorphingComponent />;
    ReactTestUtils.renderIntoDocument(instance);

    var renderedChild = reactComponentExpect(instance)
      .expectRenderedChild()
      .instance();

    ReactTestUtils.Simulate.click(renderedChild);
    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('b');
  });

  it('should rewire refs when rendering to different child types', function() {
    var instance = <MorphingComponent />;
    ReactTestUtils.renderIntoDocument(instance);

    reactComponentExpect(instance.refs.x).toBeDOMComponentWithTag('a');
    instance._toggleActivatedState();
    reactComponentExpect(instance.refs.x).toBeDOMComponentWithTag('b');
    instance._toggleActivatedState();
    reactComponentExpect(instance.refs.x).toBeDOMComponentWithTag('a');
  });

  it('should not cache old DOM nodes when switching constructors', function() {
    var instance = <ChildUpdates renderAnchor={true} anchorClassOn={false}/>;
    ReactTestUtils.renderIntoDocument(instance);
    instance.setProps({anchorClassOn: true});  // Warm any cache
    instance.setProps({renderAnchor: false});  // Clear out the anchor
    // rerender
    instance.setProps({renderAnchor: true, anchorClassOn: false});
    var anchorID = instance.getAnchorID();
    var actualDOMAnchorNode = ReactID.getNode(anchorID);
    expect(actualDOMAnchorNode.className).toBe('');
  });

  it('should auto bind methods and values correctly', function() {
    var ComponentClass = React.createClass({
      getInitialState: function() {
        return {valueToReturn: 'hi'};
      },
      methodToBeExplicitlyBound: function() {
        return this;
      },
      methodAutoBound: function() {
        return this;
      },
      methodExplicitlyNotBound: ReactDoNotBindDeprecated.doNotBind(function() {
        return this;
      }),
      render: function() {
        return <div> </div>;
      }
    });
    var instance = <ComponentClass />;

    // These are controversial assertions for now, they just exist
    // because existing code depends on these assumptions.
    expect(function() {
      instance.methodToBeExplicitlyBound.bind(instance)();
    }).not.toThrow();
    expect(function() {
      instance.methodAutoBound();
    }).not.toThrow();
    expect(function() {
      instance.methodExplicitlyNotBound();
    }).not.toThrow();

    // Next, prove that once mounted, the scope is bound correctly to the actual
    // component.
    ReactTestUtils.renderIntoDocument(instance);
    var explicitlyBound = instance.methodToBeExplicitlyBound.bind(instance);
    var autoBound = instance.methodAutoBound;
    var explicitlyNotBound = instance.methodExplicitlyNotBound;

    var context = {};
    expect(explicitlyBound.call(context)).toBe(instance);
    expect(autoBound.call(context)).toBe(instance);
    expect(explicitlyNotBound.call(context)).toBe(context);

    expect(explicitlyBound.call(instance)).toBe(instance);
    expect(autoBound.call(instance)).toBe(instance);
    expect(explicitlyNotBound.call(instance)).toBe(instance);

  });

  it('should normalize props with default values', function() {
    var Component = React.createClass({
      propTypes: {key: ReactPropTypes.string.isRequired},
      getDefaultProps: function() {
        return {key: 'testKey'};
      },
      getInitialState: function() {
        return {key: this.props.key + 'State'};
      },
      render: function() {
        return <span>{this.props.key}</span>;
      }
    });

    var instance = <Component />;
    ReactTestUtils.renderIntoDocument(instance);
    reactComponentExpect(instance).scalarPropsEqual({key: 'testKey'});
    reactComponentExpect(instance).scalarStateEqual({key: 'testKeyState'});

    expect(function() {
      ReactTestUtils.renderIntoDocument(<Component key={null} />);
    }).toThrow(
      'Invariant Violation: Required prop `key` was not specified in ' +
      '`Component`.'
    );
  });

  it('should check default prop values', function() {
    var Component = React.createClass({
      propTypes: {key: ReactPropTypes.string.isRequired},
      getDefaultProps: function() {
        return {key: null};
      },
      render: function() {
        return <span>{this.props.key}</span>;
      }
    });

    var instance = <Component />;
    expect(function() {
      ReactTestUtils.renderIntoDocument(instance);
    }).toThrow(
      'Invariant Violation: Required prop `key` was not specified in ' +
      '`Component`.'
    );
  });

  it('should check declared prop types', function() {
    var Component = React.createClass({
      propTypes: {
        key: ReactPropTypes.string.isRequired
      },
      render: function() {
        return <span>{this.props.key}</span>;
      }
    });

    expect(function() {
      ReactTestUtils.renderIntoDocument(<Component />);
    }).toThrow(
      'Invariant Violation: Required prop `key` was not specified in ' +
      '`Component`.'
    );

    expect(function() {
      ReactTestUtils.renderIntoDocument(<Component key={42} />);
    }).toThrow(
      'Invariant Violation: Invalid prop `key` of type `number` supplied to ' +
      '`Component`, expected `string`.'
    );

    expect(function() {
      ReactTestUtils.renderIntoDocument(<Component key="string" />);
    }).not.toThrow();
  });

  it('should not allow `forceUpdate` on unmounted components', function() {
    var container = document.createElement('div');
    document.documentElement.appendChild(container);

    var Component = React.createClass({
      render: function() {
        return <div />;
      }
    });

    var instance = <Component />;
    expect(function() {
      instance.forceUpdate();
    }).toThrow(
      'Invariant Violation: forceUpdate(...): Can only force an update on ' +
      'mounted or mounting components.'
    );

    React.renderComponent(instance, container);
    expect(function() {
      instance.forceUpdate();
    }).not.toThrow();

    React.unmountAndReleaseReactRootNode(container);
    expect(function() {
      instance.forceUpdate();
    }).toThrow(
      'Invariant Violation: forceUpdate(...): Can only force an update on ' +
      'mounted or mounting components.'
    );
  });

  it('should cleanup even if render() fatals', function() {
    var BadComponent = React.createClass({
      render: function() {
        throw new Error();
      }
    });
    var instance = <BadComponent />;

    expect(ReactCurrentOwner.current).toBe(null);

    expect(function() {
      ReactTestUtils.renderIntoDocument(instance);
    }).toThrow();

    expect(ReactCurrentOwner.current).toBe(null);
  });

});
