/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React = require('react');
let ReactDOM = require('react-dom');
let ReactDOMServer = require('react-dom/server');
let AsyncComponent = React.unstable_AsyncComponent;

describe('ReactDOMRoot', () => {
  let container;

  let scheduledCallback;
  let flush;
  let now;
  let expire;

  beforeEach(() => {
    container = document.createElement('div');

    // Override requestIdleCallback
    scheduledCallback = null;
    flush = function(units = Infinity) {
      if (scheduledCallback !== null) {
        let didStop = false;
        while (scheduledCallback !== null && !didStop) {
          const cb = scheduledCallback;
          scheduledCallback = null;
          cb({
            timeRemaining() {
              if (units > 0) {
                return 999;
              }
              didStop = true;
              return 0;
            },
          });
          units--;
        }
      }
    };
    global.performance = {
      now() {
        return now;
      },
    };
    global.requestIdleCallback = function(cb) {
      scheduledCallback = cb;
    };

    now = 0;
    expire = function(ms) {
      now += ms;
    };
    global.performance = {
      now() {
        return now;
      },
    };

    jest.resetModules();
    require('shared/ReactFeatureFlags').enableCreateRoot = true;
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMServer = require('react-dom/server');
    AsyncComponent = React.unstable_AsyncComponent;
  });

  it('renders children', () => {
    const root = ReactDOM.createRoot(container);
    root.render(<div>Hi</div>);
    flush();
    expect(container.textContent).toEqual('Hi');
  });

  it('unmounts children', () => {
    const root = ReactDOM.createRoot(container);
    root.render(<div>Hi</div>);
    flush();
    expect(container.textContent).toEqual('Hi');
    root.unmount();
    flush();
    expect(container.textContent).toEqual('');
  });

  it('`root.render` returns a thenable work object', () => {
    const root = ReactDOM.createRoot(container);
    const work = root.render(<AsyncComponent>Hi</AsyncComponent>);
    let ops = [];
    work.then(() => {
      ops.push('inside callback: ' + container.textContent);
    });
    ops.push('before committing: ' + container.textContent);
    flush();
    ops.push('after committing: ' + container.textContent);
    expect(ops).toEqual([
      'before committing: ',
      // `then` callback should fire during commit phase
      'inside callback: Hi',
      'after committing: Hi',
    ]);
  });

  it('resolves `work.then` callback synchronously if the work already committed', () => {
    const root = ReactDOM.createRoot(container);
    const work = root.render(<AsyncComponent>Hi</AsyncComponent>);
    flush();
    let ops = [];
    work.then(() => {
      ops.push('inside callback');
    });
    expect(ops).toEqual(['inside callback']);
  });

  it('supports hydration', async () => {
    const markup = await new Promise(resolve =>
      resolve(
        ReactDOMServer.renderToString(
          <div>
            <span className="extra" />
          </div>,
        ),
      ),
    );

    // Does not hydrate by default
    const container1 = document.createElement('div');
    container1.innerHTML = markup;
    const root1 = ReactDOM.createRoot(container1);
    root1.render(
      <div>
        <span />
      </div>,
    );
    flush();

    // Accepts `hydrate` option
    const container2 = document.createElement('div');
    container2.innerHTML = markup;
    const root2 = ReactDOM.createRoot(container2, {hydrate: true});
    root2.render(
      <div>
        <span />
      </div>,
    );
    expect(flush).toWarnDev('Extra attributes');
  });

  it('does not clear existing children', async () => {
    container.innerHTML = '<div>a</div><div>b</div>';
    const root = ReactDOM.createRoot(container);
    root.render(
      <div>
        <span>c</span>
        <span>d</span>
      </div>,
    );
    flush();
    expect(container.textContent).toEqual('abcd');
    root.render(
      <div>
        <span>d</span>
        <span>c</span>
      </div>,
    );
    flush();
    expect(container.textContent).toEqual('abdc');
  });

  it('can defer a commit by batching it', () => {
    const root = ReactDOM.createRoot(container);
    const batch = root.createBatch();
    batch.render(<div>Hi</div>);
    // Hasn't committed yet
    expect(container.textContent).toEqual('');
    // Commit
    batch.commit();
    expect(container.textContent).toEqual('Hi');
  });

  it('does not restart a completed batch when committing if there were no intervening updates', () => {
    let ops = [];
    function Foo(props) {
      ops.push('Foo');
      return props.children;
    }
    const root = ReactDOM.createRoot(container);
    const batch = root.createBatch();
    batch.render(<Foo>Hi</Foo>);
    // Flush all async work.
    flush();
    // Root should complete without committing.
    expect(ops).toEqual(['Foo']);
    expect(container.textContent).toEqual('');

    ops = [];

    // Commit. Shouldn't re-render Foo.
    batch.commit();
    expect(ops).toEqual([]);
    expect(container.textContent).toEqual('Hi');
  });

  it('can wait for a batch to finish', () => {
    const Async = React.unstable_AsyncComponent;
    const root = ReactDOM.createRoot(container);
    const batch = root.createBatch();
    batch.render(<Async>Foo</Async>);

    flush();

    // Hasn't updated yet
    expect(container.textContent).toEqual('');

    let ops = [];
    batch.then(() => {
      // Still hasn't updated
      ops.push(container.textContent);
      // Should synchronously commit
      batch.commit();
      ops.push(container.textContent);
    });

    expect(ops).toEqual(['', 'Foo']);
  });

  it('`batch.render` returns a thenable work object', () => {
    const root = ReactDOM.createRoot(container);
    const batch = root.createBatch();
    const work = batch.render('Hi');
    let ops = [];
    work.then(() => {
      ops.push('inside callback: ' + container.textContent);
    });
    ops.push('before committing: ' + container.textContent);
    batch.commit();
    ops.push('after committing: ' + container.textContent);
    expect(ops).toEqual([
      'before committing: ',
      // `then` callback should fire during commit phase
      'inside callback: Hi',
      'after committing: Hi',
    ]);
  });

  it('can commit an empty batch', () => {
    const root = ReactDOM.createRoot(container);
    root.render(<AsyncComponent>1</AsyncComponent>);

    expire(2000);
    // This batch has a later expiration time than the earlier update.
    const batch = root.createBatch();

    // This should not flush the earlier update.
    batch.commit();
    expect(container.textContent).toEqual('');

    flush();
    expect(container.textContent).toEqual('1');
  });

  it('two batches created simultaneously are committed separately', () => {
    // (In other words, they have distinct expiration times)
    const root = ReactDOM.createRoot(container);
    const batch1 = root.createBatch();
    batch1.render(1);
    const batch2 = root.createBatch();
    batch2.render(2);

    expect(container.textContent).toEqual('');

    batch1.commit();
    expect(container.textContent).toEqual('1');

    batch2.commit();
    expect(container.textContent).toEqual('2');
  });

  it('commits an earlier batch without committing a later batch', () => {
    const root = ReactDOM.createRoot(container);
    const batch1 = root.createBatch();
    batch1.render(1);

    // This batch has a later expiration time
    expire(2000);
    const batch2 = root.createBatch();
    batch2.render(2);

    expect(container.textContent).toEqual('');

    batch1.commit();
    expect(container.textContent).toEqual('1');

    batch2.commit();
    expect(container.textContent).toEqual('2');
  });

  it('commits a later batch without committing an earlier batch', () => {
    const root = ReactDOM.createRoot(container);
    const batch1 = root.createBatch();
    batch1.render(1);

    // This batch has a later expiration time
    expire(2000);
    const batch2 = root.createBatch();
    batch2.render(2);

    expect(container.textContent).toEqual('');

    batch2.commit();
    expect(container.textContent).toEqual('2');

    batch1.commit();
    flush();
    expect(container.textContent).toEqual('1');
  });
});
