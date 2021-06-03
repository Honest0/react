let React;
let ReactNoop;
let Scheduler;
let Suspense;
let useEffect;
let getCacheForType;

let caches;
let seededCache;

describe('ReactSuspenseWithNoopRenderer', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    Suspense = React.Suspense;
    useEffect = React.useEffect;

    getCacheForType = React.unstable_getCacheForType;

    caches = [];
    seededCache = null;
  });

  function createTextCache() {
    if (seededCache !== null) {
      // Trick to seed a cache before it exists.
      // TODO: Need a built-in API to seed data before the initial render (i.e.
      // not a refresh because nothing has mounted yet).
      const cache = seededCache;
      seededCache = null;
      return cache;
    }

    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.unstable_yieldValue(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          Scheduler.unstable_yieldValue(`Error! [${text}]`);
          throw record.value;
        case 'resolved':
          return textCache.version;
      }
    } else {
      Scheduler.unstable_yieldValue(`Suspend! [${text}]`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.data.set(text, newRecord);

      throw thenable;
    }
  }

  function resolveMostRecentTextCache(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  const resolveText = resolveMostRecentTextCache;

  // @gate experimental || www
  it('regression: false positive for legacy suspense', async () => {
    // Wrapping in memo because regular function components go through the
    // mountIndeterminateComponent path, which acts like there's no `current`
    // fiber even though there is. `memo` is not indeterminate, so it goes
    // through the update path.
    const Child = React.memo(({text}) => {
      // If text hasn't resolved, this will throw and exit before the passive
      // static effect flag is added by the useEffect call below.
      readText(text);

      useEffect(() => {
        Scheduler.unstable_yieldValue('Effect');
      }, []);

      Scheduler.unstable_yieldValue(text);
      return text;
    });

    function App() {
      return (
        <Suspense fallback="Loading...">
          <Child text="Async" />
        </Suspense>
      );
    }

    const root = ReactNoop.createLegacyRoot(null);

    // On initial mount, the suspended component is committed in an incomplete
    // state, without a passive static effect flag.
    await ReactNoop.act(async () => {
      root.render(<App />);
    });
    expect(Scheduler).toHaveYielded(['Suspend! [Async]']);
    expect(root).toMatchRenderedOutput('Loading...');

    // When the promise resolves, a passive static effect flag is added. In the
    // regression, the "missing expected static flag" would fire, because the
    // previous fiber did not have one.
    await ReactNoop.act(async () => {
      resolveText('Async');
    });
    expect(Scheduler).toHaveYielded(['Async', 'Effect']);
    expect(root).toMatchRenderedOutput('Async');
  });
});
