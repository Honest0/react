/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

let React;
let ReactDOM;
let ReactART;
let ARTSVGMode;
let ARTCurrentMode;
let TestRenderer;
let ARTTest;

global.__DEV__ = process.env.NODE_ENV !== 'production';
global.__EXPERIMENTAL__ = process.env.RELEASE_CHANNEL === 'experimental';

jest.mock('react-dom', () =>
  require.requireActual('react-dom/cjs/react-dom-testing.development.js')
);
// we'll replace the above with react/testing and react-dom/testing right before the next minor

expect.extend(require('../toWarnDev'));

function App(props) {
  return 'hello world';
}

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ReactDOM = require('react-dom');
  ReactART = require('react-art');
  ARTSVGMode = require('art/modes/svg');
  ARTCurrentMode = require('art/modes/current');
  TestRenderer = require('react-test-renderer');

  ARTCurrentMode.setCurrent(ARTSVGMode);

  ARTTest = function ARTTestComponent(props) {
    return (
      <ReactART.Surface width={150} height={200}>
        <ReactART.Group>
          <ReactART.Shape
            d="M0,0l50,0l0,50l-50,0z"
            fill={new ReactART.LinearGradient(['black', 'white'])}
            key="a"
            width={50}
            height={50}
            x={50}
            y={50}
            opacity={0.1}
          />
          <ReactART.Shape
            fill="#3C5A99"
            key="b"
            scale={0.5}
            x={50}
            y={50}
            title="This is an F"
            cursor="pointer">
            M64.564,38.583H54l0.008-5.834c0-3.035,0.293-4.666,4.657-4.666
            h5.833V16.429h-9.33c-11.213,0-15.159,5.654-15.159,15.16v6.994
            h-6.99v11.652h6.99v33.815H54V50.235h9.331L64.564,38.583z
          </ReactART.Shape>
        </ReactART.Group>
      </ReactART.Surface>
    );
  };
});

it("doesn't warn when you use the right act + renderer: dom", () => {
  ReactDOM.act(() => {
    ReactDOM.render(<App />, document.createElement('div'));
  });
});

it("doesn't warn when you use the right act + renderer: test", () => {
  TestRenderer.act(() => {
    TestRenderer.create(<App />);
  });
});

it('resets correctly across renderers', () => {
  function Effecty() {
    React.useEffect(() => {}, []);
    return null;
  }
  ReactDOM.act(() => {
    TestRenderer.act(() => {});
    expect(() => {
      TestRenderer.create(<Effecty />);
    }).toWarnDev(["It looks like you're using the wrong act()"], {
      withoutStack: true,
    });
  });
});

it('warns when using the wrong act version - test + dom: render', () => {
  expect(() => {
    TestRenderer.act(() => {
      ReactDOM.render(<App />, document.createElement('div'));
    });
  }).toWarnDev(["It looks like you're using the wrong act()"], {
    withoutStack: true,
  });
});

it('warns when using the wrong act version - test + dom: updates', () => {
  let setCtr;
  function Counter(props) {
    const [ctr, _setCtr] = React.useState(0);
    setCtr = _setCtr;
    return ctr;
  }
  ReactDOM.render(<Counter />, document.createElement('div'));
  expect(() => {
    TestRenderer.act(() => {
      setCtr(1);
    });
  }).toWarnDev(["It looks like you're using the wrong act()"]);
});

it('warns when using the wrong act version - dom + test: .create()', () => {
  expect(() => {
    ReactDOM.act(() => {
      TestRenderer.create(<App />);
    });
  }).toWarnDev(["It looks like you're using the wrong act()"], {
    withoutStack: true,
  });
});

it('warns when using the wrong act version - dom + test: .update()', () => {
  const root = TestRenderer.create(<App key="one" />);
  expect(() => {
    ReactDOM.act(() => {
      root.update(<App key="two" />);
    });
  }).toWarnDev(["It looks like you're using the wrong act()"], {
    withoutStack: true,
  });
});

it('warns when using the wrong act version - dom + test: updates', () => {
  let setCtr;
  function Counter(props) {
    const [ctr, _setCtr] = React.useState(0);
    setCtr = _setCtr;
    return ctr;
  }
  TestRenderer.create(<Counter />);
  expect(() => {
    ReactDOM.act(() => {
      setCtr(1);
    });
  }).toWarnDev(["It looks like you're using the wrong act()"]);
});

it('does not warn when nesting react-act inside react-dom', () => {
  ReactDOM.act(() => {
    ReactDOM.render(<ARTTest />, document.createElement('div'));
  });
});

it('does not warn when nesting react-act inside react-test-renderer', () => {
  TestRenderer.act(() => {
    TestRenderer.create(<ARTTest />);
  });
});

it("doesn't warn if you use nested acts from different renderers", () => {
  TestRenderer.act(() => {
    ReactDOM.act(() => {
      TestRenderer.create(<App />);
    });
  });
});

if (__EXPERIMENTAL__) {
  it('warns when using createRoot() + .render', () => {
    const root = ReactDOM.createRoot(document.createElement('div'));
    expect(() => {
      TestRenderer.act(() => {
        root.render(<App />);
      });
    }).toWarnDev(
      [
        'In Concurrent or Sync modes, the "scheduler" module needs to be mocked',
        "It looks like you're using the wrong act()",
      ],
      {
        withoutStack: true,
      }
    );
  });
}
