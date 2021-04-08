/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof ReactTestRenderer from 'react-test-renderer';
import {withErrorsOrWarningsIgnored} from 'react-devtools-shared/src/__tests__/utils';

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';

describe('InspectedElement', () => {
  let React;
  let ReactDOM;
  let PropTypes;
  let TestRenderer: ReactTestRenderer;
  let bridge: FrontendBridge;
  let store: Store;
  let meta;
  let utils;

  let BridgeContext;
  let InspectedElementContext;
  let InspectedElementContextController;
  let StoreContext;
  let TestUtils;
  let TreeContextController;

  let TestUtilsAct;
  let TestRendererAct;

  let testRendererInstance;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    meta = require('react-devtools-shared/src/hydration').meta;

    bridge = global.bridge;
    store = global.store;
    store.collapseNodesByDefault = false;

    React = require('react');
    ReactDOM = require('react-dom');
    PropTypes = require('prop-types');
    TestUtils = require('react-dom/test-utils');
    TestUtilsAct = TestUtils.unstable_concurrentAct;
    TestRenderer = utils.requireTestRenderer();
    TestRendererAct = TestUtils.unstable_concurrentAct;

    BridgeContext = require('react-devtools-shared/src/devtools/views/context')
      .BridgeContext;
    InspectedElementContext = require('react-devtools-shared/src/devtools/views/Components/InspectedElementContext')
      .InspectedElementContext;
    InspectedElementContextController = require('react-devtools-shared/src/devtools/views/Components/InspectedElementContext')
      .InspectedElementContextController;
    StoreContext = require('react-devtools-shared/src/devtools/views/context')
      .StoreContext;
    TreeContextController = require('react-devtools-shared/src/devtools/views/Components/TreeContext')
      .TreeContextController;

    // Used by inspectElementAtIndex() helper function
    testRendererInstance = TestRenderer.create(null, {
      unstable_isConcurrent: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const Contexts = ({
    children,
    defaultSelectedElementID = null,
    defaultSelectedElementIndex = null,
  }) => (
    <BridgeContext.Provider value={bridge}>
      <StoreContext.Provider value={store}>
        <TreeContextController
          defaultSelectedElementID={defaultSelectedElementID}
          defaultSelectedElementIndex={defaultSelectedElementIndex}>
          <React.Suspense fallback="Loading...">
            <InspectedElementContextController>
              {children}
            </InspectedElementContextController>
          </React.Suspense>
        </TreeContextController>
      </StoreContext.Provider>
    </BridgeContext.Provider>
  );

  function useInspectedElement() {
    const {inspectedElement} = React.useContext(InspectedElementContext);
    return inspectedElement;
  }

  function useInspectElementPath() {
    const {inspectPaths} = React.useContext(InspectedElementContext);
    return inspectPaths;
  }

  function noop() {}

  async function inspectElementAtIndex(index, useCustomHook = noop) {
    let didFinish = false;
    let inspectedElement = null;

    function Suspender() {
      useCustomHook();
      inspectedElement = useInspectedElement();
      didFinish = true;
      return null;
    }

    const id = ((store.getElementIDAtIndex(index): any): number);

    await utils.actAsync(() => {
      testRendererInstance.update(
        <Contexts
          defaultSelectedElementID={id}
          defaultSelectedElementIndex={index}>
          <React.Suspense fallback={null}>
            <Suspender id={id} index={index} />
          </React.Suspense>
        </Contexts>,
      );
    }, false);

    expect(didFinish).toBe(true);

    return inspectedElement;
  }

  it('should inspect the currently selected element', async () => {
    const Example = () => {
      const [count] = React.useState(1);
      return count;
    };

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example a={1} b="abc" />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement).toMatchInlineSnapshot(`
      Object {
        "context": null,
        "events": undefined,
        "hooks": Array [
          Object {
            "id": 0,
            "isStateEditable": true,
            "name": "State",
            "subHooks": Array [],
            "value": 1,
          },
        ],
        "id": 2,
        "owners": null,
        "props": Object {
          "a": 1,
          "b": "abc",
        },
        "state": null,
      }
    `);
  });

  it('should have hasLegacyContext flag set to either "true" or "false" depending on which context API is used.', async () => {
    const contextData = {
      bool: true,
    };

    // Legacy Context API.
    class LegacyContextProvider extends React.Component<any> {
      static childContextTypes = {
        bool: PropTypes.bool,
      };
      getChildContext() {
        return contextData;
      }
      render() {
        return this.props.children;
      }
    }
    class LegacyContextConsumer extends React.Component<any> {
      static contextTypes = {
        bool: PropTypes.bool,
      };
      render() {
        return null;
      }
    }

    // Modern Context API
    const BoolContext = React.createContext(contextData.bool);
    BoolContext.displayName = 'BoolContext';

    class ModernContextType extends React.Component<any> {
      static contextType = BoolContext;
      render() {
        return null;
      }
    }

    const ModernContext = React.createContext();
    ModernContext.displayName = 'ModernContext';

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <React.Fragment>
          <LegacyContextProvider>
            <LegacyContextConsumer />
          </LegacyContextProvider>
          <BoolContext.Consumer>{value => null}</BoolContext.Consumer>
          <ModernContextType />
          <ModernContext.Provider value={contextData}>
            <ModernContext.Consumer>{value => null}</ModernContext.Consumer>
          </ModernContext.Provider>
        </React.Fragment>,
        container,
      ),
    );

    const cases = [
      {
        // <LegacyContextConsumer />
        index: 1,
        shouldHaveLegacyContext: true,
      },
      {
        // <BoolContext.Consumer>
        index: 2,
        shouldHaveLegacyContext: false,
      },
      {
        // <ModernContextType />
        index: 3,
        shouldHaveLegacyContext: false,
      },
      {
        // <ModernContext.Consumer>
        index: 5,
        shouldHaveLegacyContext: false,
      },
    ];

    for (let i = 0; i < cases.length; i++) {
      const {index, shouldHaveLegacyContext} = cases[i];

      // HACK: Recreate TestRenderer instance because we rely on default state values
      // from props like defaultSelectedElementID and it's easier to reset here than
      // to read the TreeDispatcherContext and update the selected ID that way.
      // We're testing the inspected values here, not the context wiring, so that's ok.
      testRendererInstance = TestRenderer.create(null, {
        unstable_isConcurrent: true,
      });

      const inspectedElement = await inspectElementAtIndex(index);

      expect(inspectedElement.context).not.toBe(null);
      expect(inspectedElement.hasLegacyContext).toBe(shouldHaveLegacyContext);
    }
  });

  it('should poll for updates for the currently selected element', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(
      () => ReactDOM.render(<Example a={1} b="abc" />, container),
      false,
    );

    let inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "a": 1,
        "b": "abc",
      }
    `);

    await utils.actAsync(
      () => ReactDOM.render(<Example a={2} b="def" />, container),
      false,
    );

    // TODO (cache)
    // This test only passes if both the check-for-updates poll AND the test renderer.update() call are included below.
    // It seems like either one of the two should be sufficient but:
    // 1. Running only check-for-updates schedules a transition that React never renders.
    // 2. Running only renderer.update() loads stale data (first props)

    // Wait for our check-for-updates poll to get the new data.
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "a": 2,
        "b": "def",
      }
    `);
  });

  it('should not re-render a function with hooks if it did not update since it was last inspected', async () => {
    let targetRenderCount = 0;

    const Wrapper = ({children}) => children;
    const Target = React.memo(props => {
      targetRenderCount++;
      // Even though his hook isn't referenced, it's used to observe backend rendering.
      React.useState(0);
      return null;
    });

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Wrapper>
          <Target a={1} b="abc" />
        </Wrapper>,
        container,
      ),
    );

    targetRenderCount = 0;

    let inspectedElement = await inspectElementAtIndex(1);
    expect(targetRenderCount).toBe(1);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "a": 1,
        "b": "abc",
      }
    `);

    const prevInspectedElement = inspectedElement;

    targetRenderCount = 0;
    inspectedElement = await inspectElementAtIndex(1);
    expect(targetRenderCount).toBe(0);
    expect(inspectedElement).toEqual(prevInspectedElement);

    targetRenderCount = 0;

    await utils.actAsync(
      () =>
        ReactDOM.render(
          <Wrapper>
            <Target a={2} b="def" />
          </Wrapper>,
          container,
        ),
      false,
    );

    // Target should have been rendered once (by ReactDOM) and once by DevTools for inspection.
    inspectedElement = await inspectElementAtIndex(1);
    expect(targetRenderCount).toBe(2);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "a": 2,
        "b": "def",
      }
    `);
  });

  it('should temporarily disable console logging when re-running a component to inspect its hooks', async () => {
    let targetRenderCount = 0;

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const Target = React.memo(props => {
      targetRenderCount++;
      console.error('error');
      console.info('info');
      console.log('log');
      console.warn('warn');
      React.useState(0);
      return null;
    });

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Target a={1} b="abc" />, container),
    );

    expect(targetRenderCount).toBe(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('error');
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith('info');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('log');
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('warn');

    const inspectedElement = await inspectElementAtIndex(0);

    expect(inspectedElement).not.toBe(null);
    expect(targetRenderCount).toBe(2);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('should support simple data types', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          boolean_false={false}
          boolean_true={true}
          infinity={Infinity}
          integer_zero={0}
          integer_one={1}
          float={1.23}
          string="abc"
          string_empty=""
          nan={NaN}
          value_null={null}
          value_undefined={undefined}
        />,
        container,
      ),
    );

    const inspectedElement = await inspectElementAtIndex(0);

    const {props} = (inspectedElement: any);
    expect(props.boolean_false).toBe(false);
    expect(props.boolean_true).toBe(true);
    expect(Number.isFinite(props.infinity)).toBe(false);
    expect(props.integer_zero).toEqual(0);
    expect(props.integer_one).toEqual(1);
    expect(props.float).toEqual(1.23);
    expect(props.string).toEqual('abc');
    expect(props.string_empty).toEqual('');
    expect(props.nan).toBeNaN();
    expect(props.value_null).toBeNull();
    expect(props.value_undefined).toBeUndefined();
  });

  it('should support complex data types', async () => {
    const Immutable = require('immutable');

    const Example = () => null;

    const arrayOfArrays = [[['abc', 123, true], []]];
    const div = document.createElement('div');
    const exampleFunction = () => {};
    const exampleDateISO = '2019-12-31T23:42:42.000Z';
    const setShallow = new Set(['abc', 123]);
    const mapShallow = new Map([
      ['name', 'Brian'],
      ['food', 'sushi'],
    ]);
    const setOfSets = new Set([new Set(['a', 'b', 'c']), new Set([1, 2, 3])]);
    const mapOfMaps = new Map([
      ['first', mapShallow],
      ['second', mapShallow],
    ]);
    const objectOfObjects = {
      inner: {string: 'abc', number: 123, boolean: true},
    };
    const objectWithSymbol = {
      [Symbol('name')]: 'hello',
    };
    const typedArray = Int8Array.from([100, -100, 0]);
    const arrayBuffer = typedArray.buffer;
    const dataView = new DataView(arrayBuffer);
    const immutableMap = Immutable.fromJS({
      a: [{hello: 'there'}, 'fixed', true],
      b: 123,
      c: {
        '1': 'xyz',
        xyz: 1,
      },
    });

    class Class {
      anonymousFunction = () => {};
    }
    const instance = new Class();

    const proxyInstance = new Proxy(() => {}, {
      get: function(_, name) {
        return function() {
          return null;
        };
      },
    });

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          anonymous_fn={instance.anonymousFunction}
          array_buffer={arrayBuffer}
          array_of_arrays={arrayOfArrays}
          // eslint-disable-next-line no-undef
          big_int={BigInt(123)}
          bound_fn={exampleFunction.bind(this)}
          data_view={dataView}
          date={new Date(exampleDateISO)}
          fn={exampleFunction}
          html_element={div}
          immutable={immutableMap}
          map={mapShallow}
          map_of_maps={mapOfMaps}
          object_of_objects={objectOfObjects}
          object_with_symbol={objectWithSymbol}
          proxy={proxyInstance}
          react_element={<span />}
          regexp={/abc/giu}
          set={setShallow}
          set_of_sets={setOfSets}
          symbol={Symbol('symbol')}
          typed_array={typedArray}
        />,
        container,
      ),
    );

    const inspectedElement = await inspectElementAtIndex(0);

    const {
      anonymous_fn,
      array_buffer,
      array_of_arrays,
      big_int,
      bound_fn,
      data_view,
      date,
      fn,
      html_element,
      immutable,
      map,
      map_of_maps,
      object_of_objects,
      object_with_symbol,
      proxy,
      react_element,
      regexp,
      set,
      set_of_sets,
      symbol,
      typed_array,
    } = (inspectedElement: any).props;

    expect(anonymous_fn[meta.inspectable]).toBe(false);
    expect(anonymous_fn[meta.name]).toBe('function');
    expect(anonymous_fn[meta.type]).toBe('function');
    expect(anonymous_fn[meta.preview_long]).toBe('ƒ () {}');
    expect(anonymous_fn[meta.preview_short]).toBe('ƒ () {}');

    expect(array_buffer[meta.size]).toBe(3);
    expect(array_buffer[meta.inspectable]).toBe(false);
    expect(array_buffer[meta.name]).toBe('ArrayBuffer');
    expect(array_buffer[meta.type]).toBe('array_buffer');
    expect(array_buffer[meta.preview_short]).toBe('ArrayBuffer(3)');
    expect(array_buffer[meta.preview_long]).toBe('ArrayBuffer(3)');

    expect(array_of_arrays[0][meta.size]).toBe(2);
    expect(array_of_arrays[0][meta.inspectable]).toBe(true);
    expect(array_of_arrays[0][meta.name]).toBe('Array');
    expect(array_of_arrays[0][meta.type]).toBe('array');
    expect(array_of_arrays[0][meta.preview_long]).toBe('[Array(3), Array(0)]');
    expect(array_of_arrays[0][meta.preview_short]).toBe('Array(2)');

    expect(big_int[meta.inspectable]).toBe(false);
    expect(big_int[meta.name]).toBe('123');
    expect(big_int[meta.type]).toBe('bigint');
    expect(big_int[meta.preview_long]).toBe('123n');
    expect(big_int[meta.preview_short]).toBe('123n');

    expect(bound_fn[meta.inspectable]).toBe(false);
    expect(bound_fn[meta.name]).toBe('bound exampleFunction');
    expect(bound_fn[meta.type]).toBe('function');
    expect(bound_fn[meta.preview_long]).toBe('ƒ bound exampleFunction() {}');
    expect(bound_fn[meta.preview_short]).toBe('ƒ bound exampleFunction() {}');

    expect(data_view[meta.size]).toBe(3);
    expect(data_view[meta.inspectable]).toBe(false);
    expect(data_view[meta.name]).toBe('DataView');
    expect(data_view[meta.type]).toBe('data_view');
    expect(data_view[meta.preview_long]).toBe('DataView(3)');
    expect(data_view[meta.preview_short]).toBe('DataView(3)');

    expect(date[meta.inspectable]).toBe(false);
    expect(date[meta.type]).toBe('date');
    expect(new Date(date[meta.preview_long]).toISOString()).toBe(
      exampleDateISO,
    );
    expect(new Date(date[meta.preview_short]).toISOString()).toBe(
      exampleDateISO,
    );

    expect(fn[meta.inspectable]).toBe(false);
    expect(fn[meta.name]).toBe('exampleFunction');
    expect(fn[meta.type]).toBe('function');
    expect(fn[meta.preview_long]).toBe('ƒ exampleFunction() {}');
    expect(fn[meta.preview_short]).toBe('ƒ exampleFunction() {}');

    expect(html_element[meta.inspectable]).toBe(false);
    expect(html_element[meta.name]).toBe('DIV');
    expect(html_element[meta.type]).toBe('html_element');
    expect(html_element[meta.preview_long]).toBe('<div />');
    expect(html_element[meta.preview_short]).toBe('<div />');

    expect(immutable[meta.inspectable]).toBeUndefined(); // Complex type
    expect(immutable[meta.name]).toBe('Map');
    expect(immutable[meta.type]).toBe('iterator');
    expect(immutable[meta.preview_long]).toBe(
      'Map(3) {"a" => List(3), "b" => 123, "c" => Map(2)}',
    );
    expect(immutable[meta.preview_short]).toBe('Map(3)');

    expect(map[meta.inspectable]).toBeUndefined(); // Complex type
    expect(map[meta.name]).toBe('Map');
    expect(map[meta.type]).toBe('iterator');
    expect(map[0][meta.type]).toBe('array');
    expect(map[meta.preview_long]).toBe(
      'Map(2) {"name" => "Brian", "food" => "sushi"}',
    );
    expect(map[meta.preview_short]).toBe('Map(2)');

    expect(map_of_maps[meta.inspectable]).toBeUndefined(); // Complex type
    expect(map_of_maps[meta.name]).toBe('Map');
    expect(map_of_maps[meta.type]).toBe('iterator');
    expect(map_of_maps[0][meta.type]).toBe('array');
    expect(map_of_maps[meta.preview_long]).toBe(
      'Map(2) {"first" => Map(2), "second" => Map(2)}',
    );
    expect(map_of_maps[meta.preview_short]).toBe('Map(2)');

    expect(object_of_objects.inner[meta.size]).toBe(3);
    expect(object_of_objects.inner[meta.inspectable]).toBe(true);
    expect(object_of_objects.inner[meta.name]).toBe('');
    expect(object_of_objects.inner[meta.type]).toBe('object');
    expect(object_of_objects.inner[meta.preview_long]).toBe(
      '{boolean: true, number: 123, string: "abc"}',
    );
    expect(object_of_objects.inner[meta.preview_short]).toBe('{…}');

    expect(object_with_symbol['Symbol(name)']).toBe('hello');

    expect(proxy[meta.inspectable]).toBe(false);
    expect(proxy[meta.name]).toBe('function');
    expect(proxy[meta.type]).toBe('function');
    expect(proxy[meta.preview_long]).toBe('ƒ () {}');
    expect(proxy[meta.preview_short]).toBe('ƒ () {}');

    expect(react_element[meta.inspectable]).toBe(false);
    expect(react_element[meta.name]).toBe('span');
    expect(react_element[meta.type]).toBe('react_element');
    expect(react_element[meta.preview_long]).toBe('<span />');
    expect(react_element[meta.preview_short]).toBe('<span />');

    expect(regexp[meta.inspectable]).toBe(false);
    expect(regexp[meta.name]).toBe('/abc/giu');
    expect(regexp[meta.preview_long]).toBe('/abc/giu');
    expect(regexp[meta.preview_short]).toBe('/abc/giu');
    expect(regexp[meta.type]).toBe('regexp');

    expect(set[meta.inspectable]).toBeUndefined(); // Complex type
    expect(set[meta.name]).toBe('Set');
    expect(set[meta.type]).toBe('iterator');
    expect(set[0]).toBe('abc');
    expect(set[1]).toBe(123);
    expect(set[meta.preview_long]).toBe('Set(2) {"abc", 123}');
    expect(set[meta.preview_short]).toBe('Set(2)');

    expect(set_of_sets[meta.inspectable]).toBeUndefined(); // Complex type
    expect(set_of_sets[meta.name]).toBe('Set');
    expect(set_of_sets[meta.type]).toBe('iterator');
    expect(set_of_sets['0'][meta.inspectable]).toBe(true);
    expect(set_of_sets[meta.preview_long]).toBe('Set(2) {Set(3), Set(3)}');
    expect(set_of_sets[meta.preview_short]).toBe('Set(2)');

    expect(symbol[meta.inspectable]).toBe(false);
    expect(symbol[meta.name]).toBe('Symbol(symbol)');
    expect(symbol[meta.type]).toBe('symbol');
    expect(symbol[meta.preview_long]).toBe('Symbol(symbol)');
    expect(symbol[meta.preview_short]).toBe('Symbol(symbol)');

    expect(typed_array[meta.inspectable]).toBeUndefined(); // Complex type
    expect(typed_array[meta.size]).toBe(3);
    expect(typed_array[meta.name]).toBe('Int8Array');
    expect(typed_array[meta.type]).toBe('typed_array');
    expect(typed_array[0]).toBe(100);
    expect(typed_array[1]).toBe(-100);
    expect(typed_array[2]).toBe(0);
    expect(typed_array[meta.preview_long]).toBe('Int8Array(3) [100, -100, 0]');
    expect(typed_array[meta.preview_short]).toBe('Int8Array(3)');
  });

  it('should not consume iterables while inspecting', async () => {
    const Example = () => null;

    function* generator() {
      throw Error('Should not be consumed!');
    }

    const container = document.createElement('div');

    const iterable = generator();
    await utils.actAsync(() =>
      ReactDOM.render(<Example prop={iterable} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);

    const {prop} = (inspectedElement: any).props;
    expect(prop[meta.inspectable]).toBe(false);
    expect(prop[meta.name]).toBe('Generator');
    expect(prop[meta.type]).toBe('opaque_iterator');
    expect(prop[meta.preview_long]).toBe('Generator');
    expect(prop[meta.preview_short]).toBe('Generator');
  });

  it('should support objects with no prototype', async () => {
    const Example = () => null;

    const object = Object.create(null);
    object.string = 'abc';
    object.number = 123;
    object.boolean = true;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example object={object} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "object": Object {
          "boolean": true,
          "number": 123,
          "string": "abc",
        },
      }
    `);
  });

  it('should support objects with overridden hasOwnProperty', async () => {
    const Example = () => null;

    const object = {
      name: 'blah',
      hasOwnProperty: true,
    };

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example object={object} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);

    // TRICKY: Don't use toMatchInlineSnapshot() for this test!
    // Our snapshot serializer relies on hasOwnProperty() for feature detection.
    expect(inspectedElement.props.object.name).toBe('blah');
    expect(inspectedElement.props.object.hasOwnProperty).toBe(true);
  });

  it('should support custom objects with enumerable properties and getters', async () => {
    class CustomData {
      _number = 42;
      get number() {
        return this._number;
      }
      set number(value) {
        this._number = value;
      }
    }

    const descriptor = ((Object.getOwnPropertyDescriptor(
      CustomData.prototype,
      'number',
    ): any): PropertyDescriptor<number>);
    descriptor.enumerable = true;
    Object.defineProperty(CustomData.prototype, 'number', descriptor);

    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example data={new CustomData()} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "_number": 42,
          "number": 42,
        },
      }
    `);
  });

  it('should support objects with with inherited keys', async () => {
    const Example = () => null;

    const base = Object.create(Object.prototype, {
      enumerableStringBase: {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      [Symbol('enumerableSymbolBase')]: {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      nonEnumerableStringBase: {
        value: 1,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      [Symbol('nonEnumerableSymbolBase')]: {
        value: 1,
        writable: true,
        enumerable: false,
        configurable: true,
      },
    });

    const object = Object.create(base, {
      enumerableString: {
        value: 2,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      nonEnumerableString: {
        value: 3,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      123: {
        value: 3,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      [Symbol('nonEnumerableSymbol')]: {
        value: 2,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      [Symbol('enumerableSymbol')]: {
        value: 3,
        writable: true,
        enumerable: true,
        configurable: true,
      },
    });

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example object={object} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "object": Object {
          "123": 3,
          "Symbol(enumerableSymbol)": 3,
          "Symbol(enumerableSymbolBase)": 1,
          "enumerableString": 2,
          "enumerableStringBase": 1,
        },
      }
    `);
  });

  it('should allow component prop value and value`s prototype has same name params.', async () => {
    const testData = Object.create(
      {
        a: undefined,
        b: Infinity,
        c: NaN,
        d: 'normal',
      },
      {
        a: {
          value: undefined,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        b: {
          value: Infinity,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        c: {
          value: NaN,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        d: {
          value: 'normal',
          writable: true,
          enumerable: true,
          configurable: true,
        },
      },
    );
    const Example = ({data}) => null;
    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example data={testData} />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "a": undefined,
          "b": Infinity,
          "c": NaN,
          "d": "normal",
        },
      }
    `);
  });

  it('should not dehydrate nested values until explicitly requested', async () => {
    const Example = () => {
      const [state] = React.useState({
        foo: {
          bar: {
            baz: 'hi',
          },
        },
      });

      return state.foo.bar.baz;
    };

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          nestedObject={{
            a: {
              b: {
                c: [
                  {
                    d: {
                      e: {},
                    },
                  },
                ],
              },
            },
          }}
        />,
        container,
      ),
    );

    let inspectedElement = null;
    let inspectElementPath = null;

    // Render once to get a handle on inspectElementPath()
    inspectedElement = await inspectElementAtIndex(0, () => {
      inspectElementPath = useInspectElementPath();
    });

    async function loadPath(path) {
      TestUtilsAct(() => {
        TestRendererAct(() => {
          inspectElementPath(path);
          jest.runOnlyPendingTimers();
        });
      });

      inspectedElement = await inspectElementAtIndex(0);
    }

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Dehydrated {
            "preview_short": {…},
            "preview_long": {b: {…}},
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'a']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "c": Dehydrated {
                "preview_short": Array(1),
                "preview_long": [{…}],
              },
            },
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'a', 'b', 'c']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "c": Array [
                Object {
                  "d": Dehydrated {
                    "preview_short": {…},
                    "preview_long": {e: {…}},
                  },
                },
              ],
            },
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'a', 'b', 'c', 0, 'd']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "c": Array [
                Object {
                  "d": Object {
                    "e": Object {},
                  },
                },
              ],
            },
          },
        },
      }
    `);

    await loadPath(['hooks', 0, 'value']);

    expect(inspectedElement.hooks).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": Array [],
          "value": Object {
            "foo": Object {
              "bar": Dehydrated {
                "preview_short": {…},
                "preview_long": {baz: "hi"},
              },
            },
          },
        },
      ]
    `);

    await loadPath(['hooks', 0, 'value', 'foo', 'bar']);

    expect(inspectedElement.hooks).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": Array [],
          "value": Object {
            "foo": Object {
              "bar": Object {
                "baz": "hi",
              },
            },
          },
        },
      ]
    `);
  });

  it('should dehydrate complex nested values when requested', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          set_of_sets={new Set([new Set([1, 2, 3]), new Set(['a', 'b', 'c'])])}
        />,
        container,
      ),
    );

    let inspectedElement = null;
    let inspectElementPath = null;

    // Render once to get a handle on inspectElementPath()
    inspectedElement = await inspectElementAtIndex(0, () => {
      inspectElementPath = useInspectElementPath();
    });

    async function loadPath(path) {
      TestUtilsAct(() => {
        TestRendererAct(() => {
          inspectElementPath(path);
          jest.runOnlyPendingTimers();
        });
      });

      inspectedElement = await inspectElementAtIndex(0);
    }

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "set_of_sets": Object {
          "0": Dehydrated {
            "preview_short": Set(3),
            "preview_long": Set(3) {1, 2, 3},
          },
          "1": Dehydrated {
            "preview_short": Set(3),
            "preview_long": Set(3) {"a", "b", "c"},
          },
        },
      }
    `);

    await loadPath(['props', 'set_of_sets', 0]);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "set_of_sets": Object {
          "0": Object {
            "0": 1,
            "1": 2,
            "2": 3,
          },
          "1": Dehydrated {
            "preview_short": Set(3),
            "preview_long": Set(3) {"a", "b", "c"},
          },
        },
      }
    `);
  });

  it('should include updates for nested values that were previously hydrated', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          nestedObject={{
            a: {
              value: 1,
              b: {
                value: 1,
              },
            },
            c: {
              value: 1,
              d: {
                value: 1,
                e: {
                  value: 1,
                },
              },
            },
          }}
        />,
        container,
      ),
    );

    let inspectedElement = null;
    let inspectElementPath = null;

    // Render once to get a handle on inspectElementPath()
    inspectedElement = await inspectElementAtIndex(0, () => {
      inspectElementPath = useInspectElementPath();
    });

    async function loadPath(path) {
      TestUtilsAct(() => {
        TestRendererAct(() => {
          inspectElementPath(path);
          jest.runOnlyPendingTimers();
        });
      });

      inspectedElement = await inspectElementAtIndex(0);
    }

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Dehydrated {
            "preview_short": {…},
            "preview_long": {b: {…}, value: 1},
          },
          "c": Dehydrated {
            "preview_short": {…},
            "preview_long": {d: {…}, value: 1},
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'a']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 1,
            },
            "value": 1,
          },
          "c": Dehydrated {
            "preview_short": {…},
            "preview_long": {d: {…}, value: 1},
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'c']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 1,
            },
            "value": 1,
          },
          "c": Object {
            "d": Object {
              "e": Dehydrated {
                "preview_short": {…},
                "preview_long": {value: 1},
              },
              "value": 1,
            },
            "value": 1,
          },
        },
      }
    `);

    TestRendererAct(() => {
      TestUtilsAct(() => {
        ReactDOM.render(
          <Example
            nestedObject={{
              a: {
                value: 2,
                b: {
                  value: 2,
                },
              },
              c: {
                value: 2,
                d: {
                  value: 2,
                  e: {
                    value: 2,
                  },
                },
              },
            }}
          />,
          container,
        );
      });
    });

    // Wait for pending poll-for-update and then update inspected element data.
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    inspectedElement = await inspectElementAtIndex(0);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 2,
            },
            "value": 2,
          },
          "c": Object {
            "d": Object {
              "e": Dehydrated {
                "preview_short": {…},
                "preview_long": {value: 2},
              },
              "value": 2,
            },
            "value": 2,
          },
        },
      }
    `);
  });

  it('should return a full update if a path is inspected for an object that has other pending changes', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          nestedObject={{
            a: {
              value: 1,
              b: {
                value: 1,
              },
            },
            c: {
              value: 1,
              d: {
                value: 1,
                e: {
                  value: 1,
                },
              },
            },
          }}
        />,
        container,
      ),
    );

    let inspectedElement = null;
    let inspectElementPath = null;

    // Render once to get a handle on inspectElementPath()
    inspectedElement = await inspectElementAtIndex(0, () => {
      inspectElementPath = useInspectElementPath();
    });

    async function loadPath(path) {
      TestUtilsAct(() => {
        TestRendererAct(() => {
          inspectElementPath(path);
          jest.runOnlyPendingTimers();
        });
      });

      inspectedElement = await inspectElementAtIndex(0);
    }

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Dehydrated {
            "preview_short": {…},
            "preview_long": {b: {…}, value: 1},
          },
          "c": Dehydrated {
            "preview_short": {…},
            "preview_long": {d: {…}, value: 1},
          },
        },
      }
    `);

    await loadPath(['props', 'nestedObject', 'a']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 1,
            },
            "value": 1,
          },
          "c": Dehydrated {
            "preview_short": {…},
            "preview_long": {d: {…}, value: 1},
          },
        },
      }
    `);

    TestRendererAct(() => {
      TestUtilsAct(() => {
        ReactDOM.render(
          <Example
            nestedObject={{
              a: {
                value: 2,
                b: {
                  value: 2,
                },
              },
              c: {
                value: 2,
                d: {
                  value: 2,
                  e: {
                    value: 2,
                  },
                },
              },
            }}
          />,
          container,
        );
      });
    });

    await loadPath(['props', 'nestedObject', 'c']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 2,
            },
            "value": 2,
          },
          "c": Object {
            "d": Object {
              "e": Dehydrated {
                "preview_short": {…},
                "preview_long": {value: 2},
              },
              "value": 2,
            },
            "value": 2,
          },
        },
      }
    `);
  });

  it('should not tear if hydration is requested after an update', async () => {
    const Example = () => null;

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          nestedObject={{
            value: 1,
            a: {
              value: 1,
              b: {
                value: 1,
              },
            },
          }}
        />,
        container,
      ),
    );

    let inspectedElement = null;
    let inspectElementPath = null;

    // Render once to get a handle on inspectElementPath()
    inspectedElement = await inspectElementAtIndex(0, () => {
      inspectElementPath = useInspectElementPath();
    });

    async function loadPath(path) {
      TestUtilsAct(() => {
        TestRendererAct(() => {
          inspectElementPath(path);
          jest.runOnlyPendingTimers();
        });
      });

      inspectedElement = await inspectElementAtIndex(0);
    }

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Dehydrated {
            "preview_short": {…},
            "preview_long": {b: {…}, value: 1},
          },
          "value": 1,
        },
      }
    `);

    TestUtilsAct(() => {
      ReactDOM.render(
        <Example
          nestedObject={{
            value: 2,
            a: {
              value: 2,
              b: {
                value: 2,
              },
            },
          }}
        />,
        container,
      );
    });

    await loadPath(['props', 'nestedObject', 'a']);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      Object {
        "nestedObject": Object {
          "a": Object {
            "b": Object {
              "value": 2,
            },
            "value": 2,
          },
          "value": 2,
        },
      }
    `);
  });

  it('should inspect hooks for components that only use context', async () => {
    const Context = React.createContext(true);
    const Example = () => {
      const value = React.useContext(Context);
      return value;
    };

    const container = document.createElement('div');
    await utils.actAsync(() =>
      ReactDOM.render(<Example a={1} b="abc" />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement).toMatchInlineSnapshot(`
      Object {
        "context": null,
        "events": undefined,
        "hooks": Array [
          Object {
            "id": null,
            "isStateEditable": false,
            "name": "Context",
            "subHooks": Array [],
            "value": true,
          },
        ],
        "id": 2,
        "owners": null,
        "props": Object {
          "a": 1,
          "b": "abc",
        },
        "state": null,
      }
    `);
  });

  it('should enable inspected values to be stored as global variables', async () => {
    const Example = () => null;

    const nestedObject = {
      a: {
        value: 1,
        b: {
          value: 1,
          c: {
            value: 1,
          },
        },
      },
    };

    await utils.actAsync(() =>
      ReactDOM.render(
        <Example nestedObject={nestedObject} />,
        document.createElement('div'),
      ),
    );

    let storeAsGlobal: StoreAsGlobal = ((null: any): StoreAsGlobal);

    const id = ((store.getElementIDAtIndex(0): any): number);
    await inspectElementAtIndex(0, () => {
      storeAsGlobal = (path: Array<string | number>) => {
        const rendererID = store.getRendererIDForElement(id);
        if (rendererID !== null) {
          const {
            storeAsGlobal: storeAsGlobalAPI,
          } = require('react-devtools-shared/src/backendAPI');
          storeAsGlobalAPI({
            bridge,
            id,
            path,
            rendererID,
          });
        }
      };
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Should store the whole value (not just the hydrated parts)
    storeAsGlobal(['props', 'nestedObject']);
    jest.runOnlyPendingTimers();
    expect(console.log).toHaveBeenCalledWith('$reactTemp0');
    expect(global.$reactTemp0).toBe(nestedObject);

    console.log.mockReset();

    // Should store the nested property specified (not just the outer value)
    storeAsGlobal(['props', 'nestedObject', 'a', 'b']);
    jest.runOnlyPendingTimers();
    expect(console.log).toHaveBeenCalledWith('$reactTemp1');
    expect(global.$reactTemp1).toBe(nestedObject.a.b);
  });

  it('should enable inspected values to be copied to the clipboard', async () => {
    const Example = () => null;

    const nestedObject = {
      a: {
        value: 1,
        b: {
          value: 1,
          c: {
            value: 1,
          },
        },
      },
    };

    await utils.actAsync(() =>
      ReactDOM.render(
        <Example nestedObject={nestedObject} />,
        document.createElement('div'),
      ),
    );

    let copyPath: CopyInspectedElementPath = ((null: any): CopyInspectedElementPath);

    const id = ((store.getElementIDAtIndex(0): any): number);
    await inspectElementAtIndex(0, () => {
      copyPath = (path: Array<string | number>) => {
        const rendererID = store.getRendererIDForElement(id);
        if (rendererID !== null) {
          const {
            copyInspectedElementPath,
          } = require('react-devtools-shared/src/backendAPI');
          copyInspectedElementPath({
            bridge,
            id,
            path,
            rendererID,
          });
        }
      };
    });

    // Should copy the whole value (not just the hydrated parts)
    copyPath(['props', 'nestedObject']);
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify(nestedObject),
    );

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    copyPath(['props', 'nestedObject', 'a', 'b']);
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify(nestedObject.a.b),
    );
  });

  it('should enable complex values to be copied to the clipboard', async () => {
    const Immutable = require('immutable');

    const Example = () => null;

    const set = new Set(['abc', 123]);
    const map = new Map([
      ['name', 'Brian'],
      ['food', 'sushi'],
    ]);
    const setOfSets = new Set([new Set(['a', 'b', 'c']), new Set([1, 2, 3])]);
    const mapOfMaps = new Map([
      ['first', map],
      ['second', map],
    ]);
    const typedArray = Int8Array.from([100, -100, 0]);
    const arrayBuffer = typedArray.buffer;
    const dataView = new DataView(arrayBuffer);
    const immutable = Immutable.fromJS({
      a: [{hello: 'there'}, 'fixed', true],
      b: 123,
      c: {
        '1': 'xyz',
        xyz: 1,
      },
    });
    // $FlowFixMe
    const bigInt = BigInt(123); // eslint-disable-line no-undef

    await utils.actAsync(() =>
      ReactDOM.render(
        <Example
          arrayBuffer={arrayBuffer}
          dataView={dataView}
          map={map}
          set={set}
          mapOfMaps={mapOfMaps}
          setOfSets={setOfSets}
          typedArray={typedArray}
          immutable={immutable}
          bigInt={bigInt}
        />,
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);

    let copyPath: CopyInspectedElementPath = ((null: any): CopyInspectedElementPath);

    await inspectElementAtIndex(0, () => {
      copyPath = (path: Array<string | number>) => {
        const rendererID = store.getRendererIDForElement(id);
        if (rendererID !== null) {
          const {
            copyInspectedElementPath,
          } = require('react-devtools-shared/src/backendAPI');
          copyInspectedElementPath({
            bridge,
            id,
            path,
            rendererID,
          });
        }
      };
    });

    // Should copy the whole value (not just the hydrated parts)
    copyPath(['props']);
    jest.runOnlyPendingTimers();
    // Should not error despite lots of unserialized values.

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    copyPath(['props', 'bigInt']);
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify('123n'),
    );

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    copyPath(['props', 'typedArray']);
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify({0: 100, 1: -100, 2: 0}),
    );
  });

  it('should display complex values of useDebugValue', async () => {
    const container = document.createElement('div');

    function useDebuggableHook() {
      React.useDebugValue({foo: 2});
      React.useState(1);
      return 1;
    }
    function DisplayedComplexValue() {
      useDebuggableHook();
      return null;
    }

    await utils.actAsync(() =>
      ReactDOM.render(<DisplayedComplexValue />, container),
    );

    const inspectedElement = await inspectElementAtIndex(0);
    expect(inspectedElement.hooks).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": null,
          "isStateEditable": false,
          "name": "DebuggableHook",
          "subHooks": Array [
            Object {
              "id": 0,
              "isStateEditable": true,
              "name": "State",
              "subHooks": Array [],
              "value": 1,
            },
          ],
          "value": Object {
            "foo": 2,
          },
        },
      ]
    `);
  });

  describe('$r', () => {
    it('should support function components', async () => {
      const Example = () => {
        const [count] = React.useState(1);
        return count;
      };

      const container = document.createElement('div');
      await utils.actAsync(() =>
        ReactDOM.render(<Example a={1} b="abc" />, container),
      );

      await inspectElementAtIndex(0);

      expect(global.$r).toMatchInlineSnapshot(`
        Object {
          "hooks": Array [
            Object {
              "id": 0,
              "isStateEditable": true,
              "name": "State",
              "subHooks": Array [],
              "value": 1,
            },
          ],
          "props": Object {
            "a": 1,
            "b": "abc",
          },
          "type": [Function],
        }
      `);
    });

    it('should support memoized function components', async () => {
      const Example = React.memo(function Example(props) {
        const [count] = React.useState(1);
        return count;
      });

      const container = document.createElement('div');
      await utils.actAsync(() =>
        ReactDOM.render(<Example a={1} b="abc" />, container),
      );

      await inspectElementAtIndex(0);

      expect(global.$r).toMatchInlineSnapshot(`
        Object {
          "hooks": Array [
            Object {
              "id": 0,
              "isStateEditable": true,
              "name": "State",
              "subHooks": Array [],
              "value": 1,
            },
          ],
          "props": Object {
            "a": 1,
            "b": "abc",
          },
          "type": [Function],
        }
      `);
    });

    it('should support forward refs', async () => {
      const Example = React.forwardRef(function Example(props, ref) {
        const [count] = React.useState(1);
        return count;
      });

      const container = document.createElement('div');
      await utils.actAsync(() =>
        ReactDOM.render(<Example a={1} b="abc" />, container),
      );

      await inspectElementAtIndex(0);

      expect(global.$r).toMatchInlineSnapshot(`
        Object {
          "hooks": Array [
            Object {
              "id": 0,
              "isStateEditable": true,
              "name": "State",
              "subHooks": Array [],
              "value": 1,
            },
          ],
          "props": Object {
            "a": 1,
            "b": "abc",
          },
          "type": [Function],
        }
      `);
    });

    it('should support class components', async () => {
      class Example extends React.Component {
        state = {
          count: 0,
        };
        render() {
          return null;
        }
      }

      const container = document.createElement('div');
      await utils.actAsync(() =>
        ReactDOM.render(<Example a={1} b="abc" />, container),
      );

      await inspectElementAtIndex(0);

      expect(global.$r.props).toMatchInlineSnapshot(`
              Object {
                "a": 1,
                "b": "abc",
              }
            `);
      expect(global.$r.state).toMatchInlineSnapshot(`
              Object {
                "count": 0,
              }
            `);
    });
  });

  describe('inline errors and warnings', () => {
    // Some actions require the Fiber id.
    // In those instances you might want to make assertions based on the ID instead of the index.
    function getErrorsAndWarningsForElement(id: number) {
      const index = ((store.getIndexOfElementID(id): any): number);
      return getErrorsAndWarningsForElementAtIndex(index);
    }

    async function getErrorsAndWarningsForElementAtIndex(index) {
      const id = ((store.getElementIDAtIndex(index): any): number);

      let errors = null;
      let warnings = null;

      function Suspender({target}) {
        const inspectedElement = useInspectedElement();
        errors = inspectedElement.errors;
        warnings = inspectedElement.warnings;
        return null;
      }

      let root;
      await utils.actAsync(() => {
        root = TestRenderer.create(
          <Contexts
            defaultSelectedElementID={id}
            defaultSelectedElementIndex={index}>
            <React.Suspense fallback={null}>
              <Suspender target={id} />
            </React.Suspense>
          </Contexts>,
          {unstable_isConcurrent: true},
        );
      }, false);
      await utils.actAsync(() => {
        root.unmount();
      }, false);

      return {errors, warnings};
    }

    it('during render get recorded', async () => {
      const Example = () => {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      };

      const container = document.createElement('div');

      await withErrorsOrWarningsIgnored(['test-only: '], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(<Example repeatWarningCount={1} />, container),
        );
      });

      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Array [
              "test-only: render error",
              1,
            ],
          ],
          "warnings": Array [
            Array [
              "test-only: render warning",
              1,
            ],
          ],
        }
      `);
    });

    it('during render get deduped', async () => {
      const Example = () => {
        console.error('test-only: render error');
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        console.warn('test-only: render warning');
        console.warn('test-only: render warning');
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(<Example repeatWarningCount={1} />, container),
        );
      });
      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Array [
              "test-only: render error",
              2,
            ],
          ],
          "warnings": Array [
            Array [
              "test-only: render warning",
              3,
            ],
          ],
        }
      `);
    });

    it('during layout (mount) get recorded', async () => {
      const Example = () => {
        // Note we only test mount because once the component unmounts,
        // it is no longer in the store and warnings are ignored.
        React.useLayoutEffect(() => {
          console.error('test-only: useLayoutEffect error');
          console.warn('test-only: useLayoutEffect warning');
        }, []);
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(<Example repeatWarningCount={1} />, container),
        );
      });

      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Array [
              "test-only: useLayoutEffect error",
              1,
            ],
          ],
          "warnings": Array [
            Array [
              "test-only: useLayoutEffect warning",
              1,
            ],
          ],
        }
      `);
    });

    it('during passive (mount) get recorded', async () => {
      const Example = () => {
        // Note we only test mount because once the component unmounts,
        // it is no longer in the store and warnings are ignored.
        React.useEffect(() => {
          console.error('test-only: useEffect error');
          console.warn('test-only: useEffect warning');
        }, []);
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(<Example repeatWarningCount={1} />, container),
        );
      });

      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Array [
              "test-only: useEffect error",
              1,
            ],
          ],
          "warnings": Array [
            Array [
              "test-only: useEffect warning",
              1,
            ],
          ],
        }
      `);
    });

    it('from react get recorded without a component stack', async () => {
      const Example = () => {
        return [<div />];
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(
        ['Warning: Each child in a list should have a unique "key" prop.'],
        async () => {
          await utils.actAsync(() =>
            ReactDOM.render(<Example repeatWarningCount={1} />, container),
          );
        },
      );

      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Array [
              "Warning: Each child in a list should have a unique \\"key\\" prop. See https://reactjs.org/link/warning-keys for more information.
            at Example",
              1,
            ],
          ],
          "warnings": Array [],
        }
      `);
    });

    it('can be cleared for the whole app', async () => {
      const Example = () => {
        console.error('test-only: render error');
        console.warn('test-only: render warning');
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(<Example repeatWarningCount={1} />, container),
        );
      });

      const {
        clearErrorsAndWarnings,
      } = require('react-devtools-shared/src/backendAPI');
      clearErrorsAndWarnings({bridge, store});

      // Flush events to the renderer.
      jest.runOnlyPendingTimers();

      const data = await getErrorsAndWarningsForElementAtIndex(0);
      expect(data).toMatchInlineSnapshot(`
        Object {
          "errors": Array [],
          "warnings": Array [],
        }
      `);
    });

    it('can be cleared for a particular Fiber (only warnings)', async () => {
      const Example = ({id}) => {
        console.error(`test-only: render error #${id}`);
        console.warn(`test-only: render warning #${id}`);
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(
            <React.Fragment>
              <Example id={1} />
              <Example id={2} />
            </React.Fragment>,
            container,
          ),
        );
      });

      let id = ((store.getElementIDAtIndex(1): any): number);
      const rendererID = store.getRendererIDForElement(id);

      const {
        clearWarningsForElement,
      } = require('react-devtools-shared/src/backendAPI');
      clearWarningsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runOnlyPendingTimers();

      let data = [
        await getErrorsAndWarningsForElement(1),
        await getErrorsAndWarningsForElement(2),
      ];
      expect(data).toMatchInlineSnapshot(`
        Array [
          Object {
            "errors": Array [
              Array [
                "test-only: render error #1",
                1,
              ],
            ],
            "warnings": Array [
              Array [
                "test-only: render warning #1",
                1,
              ],
            ],
          },
          Object {
            "errors": Array [
              Array [
                "test-only: render error #2",
                1,
              ],
            ],
            "warnings": Array [],
          },
        ]
      `);

      id = ((store.getElementIDAtIndex(0): any): number);
      clearWarningsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runOnlyPendingTimers();

      data = [
        await getErrorsAndWarningsForElement(1),
        await getErrorsAndWarningsForElement(2),
      ];
      expect(data).toMatchInlineSnapshot(`
        Array [
          Object {
            "errors": Array [
              Array [
                "test-only: render error #1",
                1,
              ],
            ],
            "warnings": Array [],
          },
          Object {
            "errors": Array [
              Array [
                "test-only: render error #2",
                1,
              ],
            ],
            "warnings": Array [],
          },
        ]
      `);
    });

    it('can be cleared for a particular Fiber (only errors)', async () => {
      const Example = ({id}) => {
        console.error(`test-only: render error #${id}`);
        console.warn(`test-only: render warning #${id}`);
        return null;
      };

      const container = document.createElement('div');
      await utils.withErrorsOrWarningsIgnored(['test-only:'], async () => {
        await utils.actAsync(() =>
          ReactDOM.render(
            <React.Fragment>
              <Example id={1} />
              <Example id={2} />
            </React.Fragment>,
            container,
          ),
        );
      });

      let id = ((store.getElementIDAtIndex(1): any): number);
      const rendererID = store.getRendererIDForElement(id);

      const {
        clearErrorsForElement,
      } = require('react-devtools-shared/src/backendAPI');
      clearErrorsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runOnlyPendingTimers();

      let data = [
        await getErrorsAndWarningsForElement(1),
        await getErrorsAndWarningsForElement(2),
      ];
      expect(data).toMatchInlineSnapshot(`
        Array [
          Object {
            "errors": Array [
              Array [
                "test-only: render error #1",
                1,
              ],
            ],
            "warnings": Array [
              Array [
                "test-only: render warning #1",
                1,
              ],
            ],
          },
          Object {
            "errors": Array [],
            "warnings": Array [
              Array [
                "test-only: render warning #2",
                1,
              ],
            ],
          },
        ]
      `);

      id = ((store.getElementIDAtIndex(0): any): number);
      clearErrorsForElement({bridge, id, rendererID});

      // Flush events to the renderer.
      jest.runOnlyPendingTimers();

      data = [
        await getErrorsAndWarningsForElement(1),
        await getErrorsAndWarningsForElement(2),
      ];
      expect(data).toMatchInlineSnapshot(`
        Array [
          Object {
            "errors": Array [],
            "warnings": Array [
              Array [
                "test-only: render warning #1",
                1,
              ],
            ],
          },
          Object {
            "errors": Array [],
            "warnings": Array [
              Array [
                "test-only: render warning #2",
                1,
              ],
            ],
          },
        ]
      `);
    });
  });
});
