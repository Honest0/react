/**
 * Copyright 2013-2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

"use strict";

var React;
var ReactTestUtils;

describe('ReactTestUtils', function() {

  beforeEach(function() {
    React = require('React');
    ReactTestUtils = require('ReactTestUtils');

    this.addMatchers(ReactTestUtils.jasmineMatchers);
  });

  it('should have shallow rendering', function() {
    var SomeComponent = React.createClass({
      render: function() {
        return (
          <div>
            <span className="child1" />
            <span className="child2" />
          </div>
        );
      }
    });

    var shallowRenderer = ReactTestUtils.createRenderer();
    shallowRenderer.render(<SomeComponent />, {});

    var result = shallowRenderer.getRenderOutput();

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />
    ]);
  });

  it('lets you update shallowly rendered components', function() {
    var SomeComponent = React.createClass({
      getInitialState: function() {
        return {clicked: false};
      },

      onClick: function() {
        this.setState({clicked: true});
      },

      render: function() {
        var className = this.state.clicked ? 'was-clicked' : '';

        if (this.props.aNew === 'prop') {
          return (
            <a
              href="#"
              onClick={this.onClick}
              className={className}>
              Test link
            </a>
          );
        } else {
          return (
            <div>
              <span className="child1" />
              <span className="child2" />
            </div>
          );
        }
      }
    });

    var shallowRenderer = ReactTestUtils.createRenderer();
    shallowRenderer.render(<SomeComponent />, {});
    var result = shallowRenderer.getRenderOutput();
    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />
    ]);

    shallowRenderer.render(<SomeComponent aNew="prop" />, {});
    var updatedResult = shallowRenderer.getRenderOutput();
    expect(updatedResult.type).toBe('a');

    var mockEvent = {};
    updatedResult.props.onClick(mockEvent);

    var updatedResultCausedByClick = shallowRenderer.getRenderOutput();
    expect(updatedResultCausedByClick.type).toBe('a');
    expect(updatedResultCausedByClick.props.className).toBe('was-clicked');
  });

  it('Test scryRenderedDOMComponentsWithClass with TextComponent', function() {
    var renderedComponent = ReactTestUtils.renderIntoDocument(<div>Hello <span>Jim</span></div>);
    var scryResults = ReactTestUtils.scryRenderedDOMComponentsWithClass(
      renderedComponent,
      'NonExistantClass'
    );
    expect(scryResults.length).toBe(0);

  });

  it('expect console warn message success (jasmine integration)', function() {
    expect(function(){console.warn('candy');}).toWarn('candy');
    expect(function(){console.warn('candy');}).toWarn(1);
  });

  it('expect console warn to return true/false (direct invocation)', function() {
    var scope = { actual: function(){console.warn('candy');} };
    expect((ReactTestUtils.jasmineMatchers.toWarn.bind(scope))('candy')).toBe(true);
    expect(ReactTestUtils.jasmineMatchers.toWarn.bind(scope)('ice cream')).toBe(false);
    expect(ReactTestUtils.jasmineMatchers.toWarn.bind(scope)(1)).toBe(true);
    expect(ReactTestUtils.jasmineMatchers.toWarn.bind(scope)(2)).toBe(false);
  });
});
