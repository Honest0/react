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
var MorphingAutoBindComponent;
var ChildUpdates;
var React;
var ReactProps;
var ReactTestUtils;

var cx;
var reactComponentExpect;

describe('ReactCompositeComponent', function() {

  beforeEach(function() {
    cx = require('cx');
    reactComponentExpect = require('reactComponentExpect');
    React = require('React');
    ReactProps = require('ReactProps');
    ReactTestUtils = require('ReactTestUtils');

    MorphingComponent = React.createClass({
      getInitialState: function() {
        return {activated: false};
      },

      _toggleActivatedState: function() {
        this.setState({activated: !this.state.activated});
      },

      render: function() {
        var toggleActivatedState = this._toggleActivatedState.bind(this);
        return !this.state.activated ?
          <a ref="x" onClick={toggleActivatedState} /> :
          <b ref="x" onClick={toggleActivatedState} />;
      }
    });

    MorphingAutoBindComponent = React.createClass({
      getInitialState: function() {
        return {activated: false};
      },

      _toggleActivatedState: React.autoBind(function() {
        this.setState({activated: !this.state.activated});
      }),

      render: function() {
        return !this.state.activated ?
          <a ref="x" onClick={this._toggleActivatedState} /> :
          <b ref="x" onClick={this._toggleActivatedState} />;
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

  it('should behave the same with React.autoBind', function() {
    var instance = <MorphingAutoBindComponent />;
    ReactTestUtils.renderIntoDocument(instance);

    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('a');

    var renderedChild = reactComponentExpect(instance)
      .expectRenderedChild()
      .instance();

    ReactTestUtils.Simulate.click(renderedChild);
    reactComponentExpect(instance)
      .expectRenderedChild()
      .toBeDOMComponentWithTag('b');
  });

  it('should not cache old DOM nodes when switching constructors', function() {
    var instance = <ChildUpdates renderAnchor={true} anchorClassOn={false}/>;
    ReactTestUtils.renderIntoDocument(instance);
    instance.setProps({anchorClassOn: true});  // Warm any cache
    instance.setProps({renderAnchor: false});  // Clear out the anchor
    // rerender
    instance.setProps({renderAnchor: true, anchorClassOn: false});
    var anchorID = instance.getAnchorID();
    var actualDOMAnchorNode = document.getElementById(anchorID);
    expect(actualDOMAnchorNode.className).toBe('');
  });

  it('should auto bind methods and values correctly', function() {
    var RETURN_VALUE_AFTER_MOUNT = 'returnValue';
    var ComponentClass = React.createClass({
      getInitialState: function() {
        return {
          valueToReturn: RETURN_VALUE_AFTER_MOUNT
        };
      },
      methodBoundOnMount: React.autoBind(function() {
        return this.state.valueToReturn;
      }),
      render: function() {
        return <div> </div>;
      }
    });
    var instance = <ComponentClass />;

    // Autobound methods will throw before mounting.
    expect(function() {
      instance.methodBoundOnMount();
    }).toThrow();

    // Next, prove that once mounted, the scope is bound correctly to the actual
    // component.
    ReactTestUtils.renderIntoDocument(instance);
    var retValAfterMount = instance.methodBoundOnMount();
    expect(retValAfterMount).toBe(RETURN_VALUE_AFTER_MOUNT);
    var retValAfterMountWithCrazyScope =
      instance.methodBoundOnMount.call({thisIsACrazyScope:null});
    expect(retValAfterMountWithCrazyScope).toBe(RETURN_VALUE_AFTER_MOUNT);
  });

  it('should check declared prop types', function() {
    var Component = React.createClass({
      props: {
        key: ReactProps.string.isRequired
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

});
