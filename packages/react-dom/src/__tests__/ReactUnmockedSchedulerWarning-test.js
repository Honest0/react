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

function App() {
  return null;
}

beforeEach(() => {
  jest.resetModules();
  jest.unmock('scheduler');
  React = require('react');
  ReactDOM = require('react-dom');
});

it('does not warn when rendering in sync mode', () => {
  expect(() => {
    ReactDOM.render(<App />, document.createElement('div'));
  }).toWarnDev([]);
});

if (__EXPERIMENTAL__) {
  it('should warn when rendering in concurrent mode', () => {
    expect(() => {
      ReactDOM.createRoot(document.createElement('div')).render(<App />);
    }).toWarnDev(
      'In Concurrent or Sync modes, the "scheduler" module needs to be mocked ' +
        'to guarantee consistent behaviour across tests and browsers.',
      {withoutStack: true},
    );
    // does not warn twice
    expect(() => {
      ReactDOM.createRoot(document.createElement('div')).render(<App />);
    }).toWarnDev([]);
  });

  it('should warn when rendering in batched mode', () => {
    expect(() => {
      ReactDOM.createSyncRoot(document.createElement('div')).render(<App />);
    }).toWarnDev(
      'In Concurrent or Sync modes, the "scheduler" module needs to be mocked ' +
        'to guarantee consistent behaviour across tests and browsers.',
      {withoutStack: true},
    );
    // does not warn twice
    expect(() => {
      ReactDOM.createSyncRoot(document.createElement('div')).render(<App />);
    }).toWarnDev([]);
  });
}
