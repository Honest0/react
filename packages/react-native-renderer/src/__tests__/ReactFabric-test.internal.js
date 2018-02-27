/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactFabric;
let createReactNativeComponentClass;
let UIManager;
let FabricUIManager;

jest.mock('shared/ReactFeatureFlags', () =>
  require('shared/forks/ReactFeatureFlags.native-fabric'),
);

describe('ReactFabric', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactFabric = require('react-native-renderer/fabric');
    FabricUIManager = require('FabricUIManager');
    UIManager = require('UIManager');
    createReactNativeComponentClass = require('../createReactNativeComponentClass')
      .default;
  });

  it('should be able to create and render a native component', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'View',
    }));

    ReactFabric.render(<View foo="test" />, 1);
    expect(FabricUIManager.createNode).toBeCalled();
    expect(FabricUIManager.appendChild).not.toBeCalled();
    expect(FabricUIManager.completeRoot).toBeCalled();
  });

  it('should be able to create and update a native component', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'View',
    }));

    const firstNode = {};

    FabricUIManager.createNode.mockReturnValue(firstNode);

    ReactFabric.render(<View foo="foo" />, 11);

    expect(FabricUIManager.createNode.mock.calls.length).toBe(1);

    ReactFabric.render(<View foo="bar" />, 11);

    expect(FabricUIManager.createNode.mock.calls.length).toBe(1);
    expect(FabricUIManager.cloneNodeWithNewProps).toBeCalledWith(firstNode, {
      foo: 'bar',
    });
  });

  it('should not call FabricUIManager.cloneNode after render for properties that have not changed', () => {
    const Text = createReactNativeComponentClass('Text', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'Text',
    }));

    ReactFabric.render(<Text foo="a">1</Text>, 11);
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildrenAndProps).not.toBeCalled();

    // If no properties have changed, we shouldn't call cloneNode.
    ReactFabric.render(<Text foo="a">1</Text>, 11);
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildrenAndProps).not.toBeCalled();

    // Only call cloneNode for the changed property (and not for text).
    ReactFabric.render(<Text foo="b">1</Text>, 11);
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewProps.mock.calls.length).toBe(1);
    expect(FabricUIManager.cloneNodeWithNewChildrenAndProps).not.toBeCalled();

    // Only call cloneNode for the changed text (and no other properties).
    ReactFabric.render(<Text foo="b">2</Text>, 11);
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren.mock.calls.length).toBe(1);
    expect(FabricUIManager.cloneNodeWithNewProps.mock.calls.length).toBe(1);
    expect(FabricUIManager.cloneNodeWithNewChildrenAndProps).not.toBeCalled();

    // Call cloneNode for both changed text and properties.
    ReactFabric.render(<Text foo="c">3</Text>, 11);
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren.mock.calls.length).toBe(1);
    expect(FabricUIManager.cloneNodeWithNewProps.mock.calls.length).toBe(1);
    expect(
      FabricUIManager.cloneNodeWithNewChildrenAndProps.mock.calls.length,
    ).toBe(1);
  });

  it('should only pass props diffs to FabricUIManager.cloneNode', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true, bar: true},
      uiViewClassName: 'View',
    }));

    ReactFabric.render(
      <View foo="a" bar="a">
        1
      </View>,
      11,
    );
    expect(FabricUIManager.cloneNode).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(FabricUIManager.cloneNodeWithNewChildrenAndProps).not.toBeCalled();

    ReactFabric.render(
      <View foo="a" bar="b">
        1
      </View>,
      11,
    );
    expect(FabricUIManager.cloneNodeWithNewProps.mock.calls[0][1]).toEqual({
      bar: 'b',
    });
    expect(FabricUIManager.__dumpHierarchyForJestTestsOnly()).toMatchSnapshot();

    ReactFabric.render(
      <View foo="b" bar="b">
        2
      </View>,
      11,
    );
    expect(
      FabricUIManager.cloneNodeWithNewChildrenAndProps.mock.calls[0][1],
    ).toEqual({
      foo: 'b',
    });
    expect(FabricUIManager.__dumpHierarchyForJestTestsOnly()).toMatchSnapshot();
  });

  it('should not call UIManager.updateView from setNativeProps for properties that have not changed', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'View',
    }));

    class Subclass extends ReactFabric.NativeComponent {
      render() {
        return <View />;
      }
    }

    [View, Subclass].forEach(Component => {
      UIManager.updateView.mockReset();

      let viewRef;
      ReactFabric.render(
        <Component
          foo="bar"
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
      );
      expect(UIManager.updateView).not.toBeCalled();

      viewRef.setNativeProps({});
      expect(UIManager.updateView).not.toBeCalled();

      viewRef.setNativeProps({foo: 'baz'});
      expect(UIManager.updateView.mock.calls.length).toBe(1);
    });
  });

  it('returns the correct instance and calls it in the callback', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'View',
    }));

    let a;
    let b;
    const c = ReactFabric.render(
      <View foo="foo" ref={v => (a = v)} />,
      11,
      function() {
        b = this;
      },
    );

    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('renders and reorders children', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {title: true},
      uiViewClassName: 'View',
    }));

    class Component extends React.Component {
      render() {
        const chars = this.props.chars.split('');
        return (
          <View>{chars.map(text => <View key={text} title={text} />)}</View>
        );
      }
    }

    // Mini multi-child stress test: lots of reorders, some adds, some removes.
    const before = 'abcdefghijklmnopqrst';
    const after = 'mxhpgwfralkeoivcstzy';

    ReactFabric.render(<Component chars={before} />, 11);
    expect(FabricUIManager.__dumpHierarchyForJestTestsOnly()).toMatchSnapshot();

    ReactFabric.render(<Component chars={after} />, 11);
    expect(FabricUIManager.__dumpHierarchyForJestTestsOnly()).toMatchSnapshot();
  });

  it('calls setState with no arguments', () => {
    let mockArgs;
    class Component extends React.Component {
      componentDidMount() {
        this.setState({}, (...args) => (mockArgs = args));
      }
      render() {
        return false;
      }
    }

    ReactFabric.render(<Component />, 11);
    expect(mockArgs.length).toEqual(0);
  });

  it('should call complete after inserting children', () => {
    const View = createReactNativeComponentClass('View', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'View',
    }));

    const snapshots = [];
    FabricUIManager.completeRoot.mockImplementation(function(
      rootTag,
      newChildSet,
    ) {
      snapshots.push(
        FabricUIManager.__dumpChildSetForJestTestsOnly(newChildSet),
      );
    });

    ReactFabric.render(
      <View foo="a">
        <View foo="b" />
      </View>,
      22,
    );
    expect(snapshots).toMatchSnapshot();
  });
});
