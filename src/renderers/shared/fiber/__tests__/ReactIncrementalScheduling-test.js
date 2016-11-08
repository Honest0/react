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

var React;
var ReactNoop;

describe('ReactIncrementalScheduling', () => {
  beforeEach(() => {
    jest.resetModuleRegistry();
    React = require('React');
    ReactNoop = require('ReactNoop');
  });

  function span(prop) {
    return { type: 'span', children: [], prop };
  }

  it('schedules and flushes animation work', () => {
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="1" />);
    });
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren()).toEqual([span('1')]);
  });

  it('schedules and flushes animation work for many roots', () => {
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
      ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    });
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:1')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:1')]);
  });

  it('flushes all scheduled animation work', () => {
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="1" />);
    });
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="2" />);
    });
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes all scheduled animation work for many roots', () => {
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
      ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    });
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
      ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    });
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('schedules and flushes deferred work', () => {
    ReactNoop.render(<span prop="1" />);
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren()).toEqual([span('1')]);
  });

  it('schedules and flushes deferred work for many roots', () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:1')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:1')]);
  });

  it('flushes scheduled deferred work fitting within deadline', () => {
    ReactNoop.render(<span prop="1" />);
    ReactNoop.render(<span prop="2" />);
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes scheduled deferred work fitting within deadline for many roots', () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('schedules more deferred work if it runs out of time', () => {
    ReactNoop.render(<span prop="1" />);
    ReactNoop.render(<span prop="2" />);
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushDeferredPri(5);
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushDeferredPri(10);
    expect(ReactNoop.getChildren()).toEqual([]);

    ReactNoop.flushDeferredPri(10);
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('schedules more deferred work if it runs out of time with many roots', () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('flushes late animation work in a deferred callback if it wins', () => {
    // Schedule early deferred
    ReactNoop.render(<span prop="1" />);
    // Schedule late animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="2" />);
    });
    expect(ReactNoop.getChildren()).toEqual([]);

    // We only scheduled deferred callback so that's what we get.
    // It will flush everything.
    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes late animation work in a deferred callback if it wins with many roots', () => {
    // Schedule early deferred
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    // Schedule late animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    });
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    // We only scheduled deferred callback so that's what we get.
    // It will flush everything.
    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('flushes late animation work in an animation callback if it wins', () => {
    // Schedule early deferred
    ReactNoop.render(<span prop="1" />);
    // Schedule late animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="2" />);
    });
    expect(ReactNoop.getChildren()).toEqual([]);

    // Flushing animation should have flushed the animation.
    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes late animation work in an animation callback if it wins with many roots', () => {
    // Schedule early deferred
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    // Schedule late animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    });
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    // Flushing animation should have flushed the animation.
    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);

    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('flushes all work in a deferred callback if it wins', () => {
    // Schedule early animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="1" />);
    });
    // Schedule late deferred
    ReactNoop.render(<span prop="2" />);
    expect(ReactNoop.getChildren()).toEqual([]);

    // Flushing deferred should have flushed both early animation and late deferred work that invalidated it.
    // This is not a common case, as animation should generally be flushed before deferred work.
    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes all work in a deferred callback if it wins with many roots', () => {
    // Schedule early animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
      ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    });
    // Schedule late deferred
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    // Flushing deferred should have flushed both early animation and late deferred work that invalidated it.
    // This is not a common case, as animation should generally be flushed before deferred work.
    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('flushes root with late deferred work in an animation callback if it wins', () => {
    // Schedule early animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.render(<span prop="1" />);
    });
    // Schedule late deferred
    ReactNoop.render(<span prop="2" />);
    expect(ReactNoop.getChildren()).toEqual([]);

    // Flushing animation work flushes everything on this root.
    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren()).toEqual([span('2')]);
  });

  it('flushes all roots with animation work in an animation callback if it wins', () => {
    // Schedule early animation
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
      ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    });
    // Schedule late deferred
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    expect(ReactNoop.getChildren('a')).toEqual([]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    // Flushing animation work flushes all roots with animation work.
    ReactNoop.flushAnimationPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([]);

    // Flushing deferred work flushes the root with only deferred work.
    ReactNoop.flushDeferredPri();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('splits deferred work on multiple roots', () => {
    // Schedule one root
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);

    // Schedule two roots
    ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    // First scheduled one gets processed first
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([]);
    expect(ReactNoop.getChildren('c')).toEqual(null);
    // Then the second one gets processed
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual(null);

    // Schedule three roots
    ReactNoop.renderToRootWithID(<span prop="a:3" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:3" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:3" />, 'c');
    // They get processed in the order they were scheduled
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:3')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([]);
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:3')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:3')]);
    expect(ReactNoop.getChildren('c')).toEqual([]);
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:3')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:3')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:3')]);

    // Schedule one root many times
    ReactNoop.renderToRootWithID(<span prop="a:4" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="a:5" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="a:6" />, 'a');
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:6')]);
  });

  it('works on deferred roots in the order they were scheduled', () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    ReactNoop.flush();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:1')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:1')]);

    // Schedule deferred work in the reverse order
    ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
    // Ensure it starts in the order it was scheduled
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:1')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
    // Schedule last bit of work, it will get processed the last
    ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
    // Keep performing work in the order it was scheduled
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
  });

  it('handles interleaved deferred and animation work', () => {
    ReactNoop.renderToRootWithID(<span prop="a:1" />, 'a');
    ReactNoop.renderToRootWithID(<span prop="b:1" />, 'b');
    ReactNoop.renderToRootWithID(<span prop="c:1" />, 'c');
    ReactNoop.flush();
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:1')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:1')]);

    // Schedule both deferred and animation work
    ReactNoop.renderToRootWithID(<span prop="a:2" />, 'a');
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="b:2" />, 'b');
      ReactNoop.renderToRootWithID(<span prop="c:2" />, 'c');
    });
    // We're flushing deferred work
    // Still, roots with animation work are handled first
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:1')]);
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:2')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);

    // More deferred and animation work just got scheduled!
    ReactNoop.renderToRootWithID(<span prop="c:3" />, 'c');
    ReactNoop.performAnimationWork(() => {
      ReactNoop.renderToRootWithID(<span prop="b:3" />, 'b');
    });
    // Animation is still handled first
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:1')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:3')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);

    // Finally we handle deferred root in the order it was scheduled
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:3')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:2')]);
    ReactNoop.flushDeferredPri(15);
    expect(ReactNoop.getChildren('a')).toEqual([span('a:2')]);
    expect(ReactNoop.getChildren('b')).toEqual([span('b:3')]);
    expect(ReactNoop.getChildren('c')).toEqual([span('c:3')]);
  });
});
