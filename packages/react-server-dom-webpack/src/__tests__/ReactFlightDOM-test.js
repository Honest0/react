/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Polyfills for test environment
global.ReadableStream = require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextDecoder = require('util').TextDecoder;

// Don't wait before processing work on the server.
// TODO: we can replace this with FlightServer.act().
global.setImmediate = cb => cb();

let act;
let use;
let clientExports;
let clientModuleError;
let webpackMap;
let Stream;
let React;
let ReactDOMClient;
let ReactServerDOMWriter;
let ReactServerDOMReader;
let Suspense;
let ErrorBoundary;

describe('ReactFlightDOM', () => {
  beforeEach(() => {
    jest.resetModules();
    act = require('jest-react').act;
    const WebpackMock = require('./utils/WebpackMock');
    clientExports = WebpackMock.clientExports;
    clientModuleError = WebpackMock.clientModuleError;
    webpackMap = WebpackMock.webpackMap;

    Stream = require('stream');
    React = require('react');
    use = React.use;
    Suspense = React.Suspense;
    ReactDOMClient = require('react-dom/client');
    ReactServerDOMWriter = require('react-server-dom-webpack/server.node');
    ReactServerDOMReader = require('react-server-dom-webpack/client');

    ErrorBoundary = class extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback(this.state.error);
        }
        return this.props.children;
      }
    };
  });

  function getTestStream() {
    const writable = new Stream.PassThrough();
    const readable = new ReadableStream({
      start(controller) {
        writable.on('data', chunk => {
          controller.enqueue(chunk);
        });
        writable.on('end', () => {
          controller.close();
        });
      },
    });
    return {
      readable,
      writable,
    };
  }

  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
  }

  it('should resolve HTML using Node streams', async () => {
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
      const model = {
        html: <HTML />,
      };
      return model;
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <App />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);
    const model = await response;
    expect(model).toEqual({
      html: (
        <div>
          <span>hello</span>
          <span>world</span>
        </div>
      ),
    });
  });

  // @gate enableUseHook
  it('should resolve the root', async () => {
    // Model
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
    function RootModel() {
      return {
        html: <HTML />,
      };
    }

    // View
    function Message({response}) {
      return <section>{use(response).html}</section>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <RootModel />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe(
      '<section><div><span>hello</span><span>world</span></div></section>',
    );
  });

  // @gate enableUseHook
  it('should not get confused by $', async () => {
    // Model
    function RootModel() {
      return {text: '$1'};
    }

    // View
    function Message({response}) {
      return <p>{use(response).text}</p>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <RootModel />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>$1</p>');
  });

  // @gate enableUseHook
  it('should not get confused by @', async () => {
    // Model
    function RootModel() {
      return {text: '@div'};
    }

    // View
    function Message({response}) {
      return <p>{use(response).text}</p>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <RootModel />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>@div</p>');
  });

  // @gate enableUseHook
  it('should unwrap async module references', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule({text}) {
      return 'Async: ' + text;
    });

    const AsyncModule2 = Promise.resolve({
      exportName: 'Module',
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = await clientExports(AsyncModule);
    const AsyncModuleRef2 = await clientExports(AsyncModule2);

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <AsyncModuleRef text={AsyncModuleRef2.exportName} />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async: Module</p>');
  });

  // @gate enableUseHook
  it('should be able to import a name called "then"', async () => {
    const thenExports = {
      then: function then() {
        return 'and then';
      },
    };

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const ThenRef = clientExports(thenExports).then;

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <ThenRef />,
      webpackMap,
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>and then</p>');
  });

  // @gate enableUseHook
  it('should progressively reveal server components', async () => {
    let reportedErrors = [];

    // Client Components

    function MyErrorBoundary({children}) {
      return (
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          {children}
        </ErrorBoundary>
      );
    }

    // Model
    function Text({children}) {
      return children;
    }

    function makeDelayedText() {
      let _resolve, _reject;
      let promise = new Promise((resolve, reject) => {
        _resolve = () => {
          promise = null;
          resolve();
        };
        _reject = e => {
          promise = null;
          reject(e);
        };
      });
      async function DelayedText({children}) {
        await promise;
        return <Text>{children}</Text>;
      }
      return [DelayedText, _resolve, _reject];
    }

    const [Friends, resolveFriends] = makeDelayedText();
    const [Name, resolveName] = makeDelayedText();
    const [Posts, resolvePosts] = makeDelayedText();
    const [Photos, resolvePhotos] = makeDelayedText();
    const [Games, , rejectGames] = makeDelayedText();

    // View
    function ProfileDetails({avatar}) {
      return (
        <div>
          <Name>:name:</Name>
          {avatar}
        </div>
      );
    }
    function ProfileSidebar({friends}) {
      return (
        <div>
          <Photos>:photos:</Photos>
          {friends}
        </div>
      );
    }
    function ProfilePosts({posts}) {
      return <div>{posts}</div>;
    }
    function ProfileGames({games}) {
      return <div>{games}</div>;
    }

    const MyErrorBoundaryClient = clientExports(MyErrorBoundary);

    function ProfileContent() {
      return (
        <>
          <ProfileDetails avatar={<Text>:avatar:</Text>} />
          <Suspense fallback={<p>(loading sidebar)</p>}>
            <ProfileSidebar friends={<Friends>:friends:</Friends>} />
          </Suspense>
          <Suspense fallback={<p>(loading posts)</p>}>
            <ProfilePosts posts={<Posts>:posts:</Posts>} />
          </Suspense>
          <MyErrorBoundaryClient>
            <Suspense fallback={<p>(loading games)</p>}>
              <ProfileGames games={<Games>:games:</Games>} />
            </Suspense>
          </MyErrorBoundaryClient>
        </>
      );
    }

    const model = {
      rootContent: <ProfileContent />,
    };

    function ProfilePage({response}) {
      return use(response).rootContent;
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      model,
      webpackMap,
      {
        onError(x) {
          reportedErrors.push(x);
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      },
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <ProfilePage response={response} />
        </Suspense>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // This isn't enough to show anything.
    await act(async () => {
      resolveFriends();
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // We can now show the details. Sidebar and posts are still loading.
    await act(async () => {
      resolveName();
    });
    // Advance time enough to trigger a nested fallback.
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        '<p>(loading games)</p>',
    );

    expect(reportedErrors).toEqual([]);

    const theError = new Error('Game over');
    // Let's *fail* loading games.
    await act(async () => {
      await rejectGames(theError);
      await 'the inner async function';
    });
    const expectedGamesValue = __DEV__
      ? '<p>Game over + a dev digest</p>'
      : '<p>digest("Game over")</p>';
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        expectedGamesValue,
    );

    expect(reportedErrors).toEqual([theError]);
    reportedErrors = [];

    // We can now show the sidebar.
    await act(async () => {
      await resolvePhotos();
      await 'the inner async function';
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<p>(loading posts)</p>' +
        expectedGamesValue,
    );

    // Show everything.
    await act(async () => {
      await resolvePosts();
      await 'the inner async function';
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<div>:posts:</div>' +
        expectedGamesValue,
    );

    expect(reportedErrors).toEqual([]);
  });

  // @gate enableUseHook
  it('should preserve state of client components on refetch', async () => {
    // Client

    function Page({response}) {
      return use(response);
    }

    function Input() {
      return <input />;
    }

    const InputClient = clientExports(Input);

    // Server

    function App({color}) {
      // Verify both DOM and Client children.
      return (
        <div style={{color}}>
          <input />
          <InputClient />
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const stream1 = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <App color="red" />,
      webpackMap,
    );
    pipe(stream1.writable);
    const response1 = ReactServerDOMReader.createFromReadableStream(
      stream1.readable,
    );
    await act(async () => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <Page response={response1} />
        </Suspense>,
      );
    });
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName).toBe('DIV');
    expect(container.children[0].style.color).toBe('red');

    // Change the DOM state for both inputs.
    const inputA = container.children[0].children[0];
    expect(inputA.tagName).toBe('INPUT');
    inputA.value = 'hello';
    const inputB = container.children[0].children[1];
    expect(inputB.tagName).toBe('INPUT');
    inputB.value = 'goodbye';

    const stream2 = getTestStream();
    const {pipe: pipe2} = ReactServerDOMWriter.renderToPipeableStream(
      <App color="blue" />,
      webpackMap,
    );
    pipe2(stream2.writable);
    const response2 = ReactServerDOMReader.createFromReadableStream(
      stream2.readable,
    );
    await act(async () => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <Page response={response2} />
        </Suspense>,
      );
    });
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName).toBe('DIV');
    expect(container.children[0].style.color).toBe('blue');

    // Verify we didn't destroy the DOM for either input.
    expect(inputA === container.children[0].children[0]).toBe(true);
    expect(inputA.tagName).toBe('INPUT');
    expect(inputA.value).toBe('hello');
    expect(inputB === container.children[0].children[1]).toBe(true);
    expect(inputB.tagName).toBe('INPUT');
    expect(inputB.value).toBe('goodbye');
  });

  // @gate enableUseHook
  it('should be able to complete after aborting and throw the reason client-side', async () => {
    const reportedErrors = [];

    const {writable, readable} = getTestStream();
    const {pipe, abort} = ReactServerDOMWriter.renderToPipeableStream(
      <div>
        <InfiniteSuspend />
      </div>,
      webpackMap,
      {
        onError(x) {
          reportedErrors.push(x);
          const message = typeof x === 'string' ? x : x.message;
          return __DEV__ ? 'a dev digest' : `digest("${message}")`;
        },
      },
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(async () => {
      root.render(
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    await act(async () => {
      abort('for reasons');
    });
    if (__DEV__) {
      expect(container.innerHTML).toBe(
        '<p>Error: for reasons + a dev digest</p>',
      );
    } else {
      expect(container.innerHTML).toBe('<p>digest("for reasons")</p>');
    }

    expect(reportedErrors).toEqual(['for reasons']);
  });

  // @gate enableUseHook
  it('should be able to recover from a direct reference erroring client-side', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function({prop}) {
      return 'This should never render';
    });

    const ClientReference = clientModuleError(new Error('module init error'));

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <div>
        <ClientComponent prop={ClientReference} />
      </div>,
      webpackMap,
      {
        onError(x) {
          reportedErrors.push(x);
        },
      },
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(async () => {
      root.render(
        <ErrorBoundary fallback={e => <p>{e.message}</p>}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<p>module init error</p>');

    expect(reportedErrors).toEqual([]);
  });

  // @gate enableUseHook
  it('should be able to recover from a direct reference erroring client-side async', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function({prop}) {
      return 'This should never render';
    });

    let rejectPromise;
    const ClientReference = await clientExports(
      new Promise((resolve, reject) => {
        rejectPromise = reject;
      }),
    );

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <div>
        <ClientComponent prop={ClientReference} />
      </div>,
      webpackMap,
      {
        onError(x) {
          reportedErrors.push(x);
        },
      },
    );
    pipe(writable);
    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(async () => {
      root.render(
        <ErrorBoundary fallback={e => <p>{e.message}</p>}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });

    expect(container.innerHTML).toBe('<p>(loading)</p>');

    await act(async () => {
      rejectPromise(new Error('async module init error'));
    });

    expect(container.innerHTML).toBe('<p>async module init error</p>');

    expect(reportedErrors).toEqual([]);
  });

  // @gate enableUseHook
  it('should be able to recover from a direct reference erroring server-side', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function({prop}) {
      return 'This should never render';
    });

    // We simulate a bug in the Webpack bundler which causes an error on the server.
    for (const id in webpackMap) {
      Object.defineProperty(webpackMap, id, {
        get: () => {
          throw new Error('bug in the bundler');
        },
      });
    }

    const {writable, readable} = getTestStream();
    const {pipe} = ReactServerDOMWriter.renderToPipeableStream(
      <div>
        <ClientComponent />
      </div>,
      webpackMap,
      {
        onError(x) {
          reportedErrors.push(x.message);
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      },
    );
    pipe(writable);

    const response = ReactServerDOMReader.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(async () => {
      root.render(
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    if (__DEV__) {
      expect(container.innerHTML).toBe(
        '<p>bug in the bundler + a dev digest</p>',
      );
    } else {
      expect(container.innerHTML).toBe('<p>digest("bug in the bundler")</p>');
    }

    expect(reportedErrors).toEqual(['bug in the bundler']);
  });
});
