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

// TODO: All these warnings should become static errors using Flow instead
// of dynamic errors when using JSX with Flow.

var React;
var ReactTestUtils;

describe('ReactJSXElementValidator', function() {
  var Component;
  var RequiredPropComponent;

  beforeEach(function() {
    jest.resetModuleRegistry();

    React = require('React');
    ReactTestUtils = require('ReactTestUtils');

    Component = class extends React.Component {
      render() {
        return <div />;
      }
    };

    RequiredPropComponent = class extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    };
    RequiredPropComponent.displayName = 'RequiredPropComponent';
    RequiredPropComponent.propTypes = {prop: React.PropTypes.string.isRequired};
  });

  it('warns for keys for arrays of elements in children position', function() {
    spyOn(console, 'error');

    void <Component>{[<Component />, <Component />]}</Component>;

    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'Each child in an array or iterator should have a unique "key" prop.'
    );
  });

  it('warns for keys for arrays of elements with owner info', function() {
    spyOn(console, 'error');

    class InnerComponent extends React.Component {
      render() {
        return <Component>{this.props.childSet}</Component>;
      }
    }

    class ComponentWrapper extends React.Component {
      render() {
        return (
          <InnerComponent
            childSet={[<Component />, <Component />]}
          />
        );
      }
    }

    ReactTestUtils.renderIntoDocument(<ComponentWrapper />);

    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'Each child in an array or iterator should have a unique "key" prop. ' +
      'Check the render method of `InnerComponent`. ' +
      'It was passed a child from ComponentWrapper. '
    );
  });

  it('warns for keys for iterables of elements in rest args', function() {
    spyOn(console, 'error');

    var iterable = {
      '@@iterator': function() {
        var i = 0;
        return {
          next: function() {
            var done = ++i > 2;
            return {value: done ? undefined : <Component />, done: done};
          },
        };
      },
    };

    void <Component>{iterable}</Component>;

    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'Each child in an array or iterator should have a unique "key" prop.'
    );
  });

  it('does not warns for arrays of elements with keys', function() {
    spyOn(console, 'error');

    void <Component>{[<Component key="#1" />, <Component key="#2" />]}</Component>;

    expect(console.error.calls.count()).toBe(0);
  });

  it('does not warns for iterable elements with keys', function() {
    spyOn(console, 'error');

    var iterable = {
      '@@iterator': function() {
        var i = 0;
        return {
          next: function() {
            var done = ++i > 2;
            return {
              value: done ? undefined : <Component key={'#' + i} />,
              done: done,
            };
          },
        };
      },
    };

    void <Component>{iterable}</Component>;

    expect(console.error.calls.count()).toBe(0);
  });

  it('does not warn for numeric keys in entry iterable as a child', function() {
    spyOn(console, 'error');

    var iterable = {
      '@@iterator': function() {
        var i = 0;
        return {
          next: function() {
            var done = ++i > 2;
            return {value: done ? undefined : [i, <Component />], done: done};
          },
        };
      },
    };
    iterable.entries = iterable['@@iterator'];

    void <Component>{iterable}</Component>;

    expect(console.error.calls.count()).toBe(0);
  });

  it('does not warn when the element is directly as children', function() {
    spyOn(console, 'error');

    void <Component><Component /><Component /></Component>;

    expect(console.error.calls.count()).toBe(0);
  });

  it('does not warn when the child array contains non-elements', function() {
    spyOn(console, 'error');

    void <Component>{[{}, {}]}</Component>;

    expect(console.error.calls.count()).toBe(0);
  });

  // TODO: These warnings currently come from the composite component, but
  // they should be moved into the ReactElementValidator.

  it('should give context for PropType errors in nested components.', () => {
    // In this test, we're making sure that if a proptype error is found in a
    // component, we give a small hint as to which parent instantiated that
    // component as per warnings about key usage in ReactElementValidator.
    spyOn(console, 'error');
    class MyComp extends React.Component {
      render() {
        return <div>My color is {this.color}</div>;
      }
    }
    MyComp.propTypes = {
      color: React.PropTypes.string,
    };
    class ParentComp extends React.Component {
      render() {
        return <MyComp color={123} />;
      }
    }
    ReactTestUtils.renderIntoDocument(<ParentComp />);
    expect(
      console.error.calls.argsFor(0)[0].replace(/\(at .+?:\d+\)/g, '(at **)')
    ).toBe(
      'Warning: Failed prop type: ' +
      'Invalid prop `color` of type `number` supplied to `MyComp`, ' +
      'expected `string`.\n' +
      '    in MyComp (at **)\n' +
      '    in ParentComp (at **)'
    );
  });

  it('gives a helpful error when passing null, undefined, or boolean', () => {
    var Undefined = undefined;
    var Null = null;
    var True = true;
    var Num = 123;
    var Div = 'div';
    spyOn(console, 'error');
    void <Undefined />;
    void <Null />;
    void <True />;
    void <Num />;
    expect(console.error.calls.count()).toBe(4);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'type should not be null, undefined, boolean, or number. It should be ' +
      'a string (for DOM elements) or a ReactClass (for composite components).'
    );
    expect(console.error.calls.argsFor(1)[0]).toContain(
      'type should not be null, undefined, boolean, or number. It should be ' +
      'a string (for DOM elements) or a ReactClass (for composite components).'
    );
    expect(console.error.calls.argsFor(2)[0]).toContain(
      'type should not be null, undefined, boolean, or number. It should be ' +
      'a string (for DOM elements) or a ReactClass (for composite components).'
    );
    expect(console.error.calls.argsFor(3)[0]).toContain(
      'type should not be null, undefined, boolean, or number. It should be ' +
      'a string (for DOM elements) or a ReactClass (for composite components).'
    );
    void <Div />;
    expect(console.error.calls.count()).toBe(4);
  });

  it('should check default prop values', function() {
    spyOn(console, 'error');

    RequiredPropComponent.defaultProps = {prop: null};

    ReactTestUtils.renderIntoDocument(<RequiredPropComponent />);

    expect(console.error.calls.count()).toBe(1);
    expect(
      console.error.calls.argsFor(0)[0].replace(/\(at .+?:\d+\)/g, '(at **)')
    ).toBe(
      'Warning: Failed prop type: The prop `prop` is marked as required in ' +
      '`RequiredPropComponent`, but its value is `null`.\n' +
      '    in RequiredPropComponent (at **)'
    );
  });

  it('should not check the default for explicit null', function() {
    spyOn(console, 'error');

    ReactTestUtils.renderIntoDocument(<RequiredPropComponent prop={null} />);

    expect(console.error.calls.count()).toBe(1);
    expect(
      console.error.calls.argsFor(0)[0].replace(/\(at .+?:\d+\)/g, '(at **)')
    ).toBe(
      'Warning: Failed prop type: The prop `prop` is marked as required in ' +
      '`RequiredPropComponent`, but its value is `null`.\n' +
      '    in RequiredPropComponent (at **)'
    );
  });

  it('should check declared prop types', function() {
    spyOn(console, 'error');

    ReactTestUtils.renderIntoDocument(<RequiredPropComponent />);
    ReactTestUtils.renderIntoDocument(<RequiredPropComponent prop={42} />);

    expect(console.error.calls.count()).toBe(2);
    expect(
      console.error.calls.argsFor(0)[0].replace(/\(at .+?:\d+\)/g, '(at **)')
    ).toBe(
      'Warning: Failed prop type: ' +
      'The prop `prop` is marked as required in `RequiredPropComponent`, but ' +
      'its value is `undefined`.\n' +
      '    in RequiredPropComponent (at **)'
    );

    expect(
      console.error.calls.argsFor(1)[0].replace(/\(at .+?:\d+\)/g, '(at **)')
    ).toBe(
      'Warning: Failed prop type: ' +
      'Invalid prop `prop` of type `number` supplied to ' +
      '`RequiredPropComponent`, expected `string`.\n' +
      '    in RequiredPropComponent (at **)'
    );

    ReactTestUtils.renderIntoDocument(<RequiredPropComponent prop="string" />);

    // Should not error for strings
    expect(console.error.calls.count()).toBe(2);
  });

  it('should warn on invalid prop types', function() {
    // Since there is no prevalidation step for ES6 classes, there is no hook
    // for us to issue a warning earlier than element creation when the error
    // actually occurs. Since this step is skipped in production, we should just
    // warn instead of throwing for this case.
    spyOn(console, 'error');
    class NullPropTypeComponent extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    }
    NullPropTypeComponent.propTypes = {
      prop: null,
    };
    ReactTestUtils.renderIntoDocument(<NullPropTypeComponent />);
    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'NullPropTypeComponent: prop type `prop` is invalid; it must be a ' +
      'function, usually from React.PropTypes.'
    );
  });

  it('should warn on invalid context types', function() {
    spyOn(console, 'error');
    class NullContextTypeComponent extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    }
    NullContextTypeComponent.contextTypes = {
      prop: null,
    };
    ReactTestUtils.renderIntoDocument(<NullContextTypeComponent />);
    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'NullContextTypeComponent: context type `prop` is invalid; it must ' +
      'be a function, usually from React.PropTypes.'
    );
  });

  it('should warn if getDefaultProps is specificed on the class', function() {
    spyOn(console, 'error');
    class GetDefaultPropsComponent extends React.Component {
      render() {
        return <span>{this.props.prop}</span>;
      }
    }
    GetDefaultPropsComponent.getDefaultProps = () => ({
      prop: 'foo',
    });
    ReactTestUtils.renderIntoDocument(<GetDefaultPropsComponent />);
    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'getDefaultProps is only used on classic React.createClass definitions.' +
      ' Use a static property named `defaultProps` instead.'
    );
  });

});
