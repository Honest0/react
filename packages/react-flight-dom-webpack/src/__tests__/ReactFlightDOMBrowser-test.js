/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

// Polyfills for test environment
global.ReadableStream = require('@mattiasbuelens/web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

let React;
let ReactFlightDOMServer;
let ReactFlightDOMClient;

describe('ReactFlightDOMBrowser', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactFlightDOMServer = require('react-flight-dom-webpack/server.browser');
    ReactFlightDOMClient = require('react-flight-dom-webpack');
  });

  async function waitForSuspense(fn) {
    while (true) {
      try {
        return fn();
      } catch (promise) {
        if (typeof promise.then === 'function') {
          await promise;
        } else {
          throw promise;
        }
      }
    }
  }

  it('should resolve HTML using W3C streams', async () => {
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }

    function App() {
      let model = {
        html: <HTML />,
      };
      return model;
    }

    let stream = ReactFlightDOMServer.renderToReadableStream(<App />);
    let response = ReactFlightDOMClient.createFromReadableStream(stream);
    await waitForSuspense(() => {
      let model = response.readRoot();
      expect(model).toEqual({
        html: (
          <div>
            <span>hello</span>
            <span>world</span>
          </div>
        ),
      });
    });
  });
});
