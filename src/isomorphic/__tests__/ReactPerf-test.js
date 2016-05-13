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

describe('ReactPerf', function() {
  var React;
  var ReactDOM;
  var ReactPerf;
  var ReactTestUtils;

  var App;
  var Box;
  var Div;

  beforeEach(function() {
    var now = 0;
    jest.setMock('fbjs/lib/performanceNow', function() {
      return now++;
    });

    if (typeof console.table !== 'function') {
      console.table = () => {};
      console.table.isFake = true;
    }

    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactPerf = require('ReactPerf');
    ReactTestUtils = require('ReactTestUtils');

    App = React.createClass({
      render: function() {
        return <div><Box /><Box flip={this.props.flipSecond} /></div>;
      },
    });

    Box = React.createClass({
      render: function() {
        return <div key={!!this.props.flip}><input /></div>;
      },
    });

    // ReactPerf only measures composites, so we put everything in one.
    Div = React.createClass({
      render: function() {
        return <div {...this.props} />;
      },
    });
  });

  afterEach(function() {
    if (console.table.isFake) {
      delete console.table;
    }
  });

  function measure(fn) {
    ReactPerf.start();
    fn();
    ReactPerf.stop();

    // Make sure none of the methods crash.
    ReactPerf.getWasted();
    ReactPerf.getInclusive();
    ReactPerf.getExclusive();
    ReactPerf.getOperations();

    return ReactPerf.getLastMeasurements();
  }

  it('should count no-op update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<App />, container);
    var measurements = measure(() => {
      ReactDOM.render(<App />, container);
    });

    var summary = ReactPerf.getWasted(measurements);
    expect(summary).toEqual([{
      key: 'App',
      instanceCount: 1,
      inclusiveRenderDuration: 3,
      renderCount: 1,
    }, {
      key: 'App > Box',
      instanceCount: 2,
      inclusiveRenderDuration: 2,
      renderCount: 2,
    }]);
  });

  it('should count no-op update in child as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<App />, container);

    // Here, we add a Box -- two of the <Box /> updates are wasted time (but the
    // addition of the third is not)
    var measurements = measure(() => {
      ReactDOM.render(<App flipSecond={true} />, container);
    });

    var summary = ReactPerf.getWasted(measurements);
    expect(summary).toEqual([{
      key: 'App > Box',
      instanceCount: 1,
      inclusiveRenderDuration: 1,
      renderCount: 1,
    }]);
  });

  function expectNoWaste(fn) {
    var measurements = measure(fn);
    var summary = ReactPerf.getWasted(measurements);
    expect(summary).toEqual([]);
  }

  it('should not count initial render as waste', function() {
    expectNoWaste(() => {
      ReactTestUtils.renderIntoDocument(<App />);
    });
  });

  it('should not count unmount as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div>hello</Div>, container);
    expectNoWaste(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });

  it('should not count content update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div>hello</Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div>hello world</Div>, container);
    });
  });

  it('should not count child addition as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div><span /></Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div><span /><span /></Div>, container);
    });
  });

  it('should not count child removal as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div><span /><span /></Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div><span /></Div>, container);
    });
  });

  it('should not count property update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div className="yellow">hey</Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div className="blue">hey</Div>, container);
    });
  });

  it('should not count style update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div style={{color: 'yellow'}}>hey</Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div style={{color: 'blue'}}>hey</Div>, container);
    });
  });

  it('should not count property removal as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div className="yellow">hey</Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div>hey</Div>, container);
    });
  });

  it('should not count raw HTML update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(
      <Div dangerouslySetInnerHTML={{__html: 'me'}} />,
      container
    );
    expectNoWaste(() => {
      ReactDOM.render(
        <Div dangerouslySetInnerHTML={{__html: 'you'}} />,
        container
      );
    });
  });

  it('should not count child reordering as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div><div key="A" /><div key="B" /></Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div><div key="B" /><div key="A" /></Div>, container);
    });
  });

  it('should not count text update as waste', function() {
    var container = document.createElement('div');
    ReactDOM.render(<Div>{'hello'}{'world'}</Div>, container);
    expectNoWaste(() => {
      ReactDOM.render(<Div>{'hello'}{'friend'}</Div>, container);
    });
  });

  it('should not count replacing null with a native as waste', function() {
    var element = null;
    function Foo() {
      return element;
    }
    var container = document.createElement('div');
    ReactDOM.render(<Foo />, container);
    expectNoWaste(() => {
      element = <div />;
      ReactDOM.render(<Foo />, container);
    });
  });

  it('should not count replacing a native with null as waste', function() {
    var element = <div />;
    function Foo() {
      return element;
    }
    var container = document.createElement('div');
    ReactDOM.render(<Foo />, container);
    expectNoWaste(() => {
      element = null;
      ReactDOM.render(<Foo />, container);
    });
  });

  it('should include stats for components unmounted during measurement', function() {
    var container = document.createElement('div');
    var measurements = measure(() => {
      ReactDOM.render(<Div><Div key="a" /></Div>, container);
      ReactDOM.render(<Div><Div key="b" /></Div>, container);
    });
    expect(ReactPerf.getExclusive(measurements)).toEqual([{
      key: 'Div',
      instanceCount: 3,
      counts: { ctor: 3, render: 4 },
      durations: { ctor: 3, render: 4 },
      totalDuration: 7,
    }]);
  });

  it('warns once when using getMeasurementsSummaryMap', function() {
    var measurements = measure(() => {});
    spyOn(console, 'error');
    ReactPerf.getMeasurementsSummaryMap(measurements);
    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      '`ReactPerf.getMeasurementsSummaryMap(...)` is deprecated. Use ' +
      '`ReactPerf.getWasted(...)` instead.'
    );

    ReactPerf.getMeasurementsSummaryMap(measurements);
    expect(console.error.calls.length).toBe(1);
  });

  it('warns once when using printDOM', function() {
    var measurements = measure(() => {});
    spyOn(console, 'error');
    ReactPerf.printDOM(measurements);
    expect(console.error.calls.length).toBe(1);
    expect(console.error.argsForCall[0][0]).toContain(
      '`ReactPerf.printDOM(...)` is deprecated. Use ' +
      '`ReactPerf.printOperations(...)` instead.'
    );

    ReactPerf.printDOM(measurements);
    expect(console.error.calls.length).toBe(1);
  });

  it('returns isRunning state', () => {
    expect(ReactPerf.isRunning()).toBe(false);

    ReactPerf.start();
    expect(ReactPerf.isRunning()).toBe(true);

    ReactPerf.stop();
    expect(ReactPerf.isRunning()).toBe(false);
  });

  it('start has no effect when already running', () => {
    expect(ReactPerf.isRunning()).toBe(false);

    ReactPerf.start();
    expect(ReactPerf.isRunning()).toBe(true);

    ReactPerf.start();
    expect(ReactPerf.isRunning()).toBe(true);

    ReactPerf.stop();
    expect(ReactPerf.isRunning()).toBe(false);
  });

  it('stop has no effect when already stopped', () => {
    expect(ReactPerf.isRunning()).toBe(false);

    ReactPerf.stop();
    expect(ReactPerf.isRunning()).toBe(false);

    ReactPerf.stop();
    expect(ReactPerf.isRunning()).toBe(false);
  });
});
