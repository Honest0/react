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

let React;
let ReactFiberReconciler;
let ConcurrentRoot;
let DefaultEventPriority;

describe('ReactFiberHostContext', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactFiberReconciler = require('react-reconciler');
    ConcurrentRoot = require('react-reconciler/src/ReactRootTags')
      .ConcurrentRoot;
    DefaultEventPriority = require('react-reconciler/src/ReactEventPriorities')
      .DefaultEventPriority;
  });

  // @gate __DEV__
  it('works with null host context', async () => {
    let creates = 0;
    const Renderer = ReactFiberReconciler({
      prepareForCommit: function() {
        return null;
      },
      resetAfterCommit: function() {},
      getRootHostContext: function() {
        return null;
      },
      getChildHostContext: function() {
        return null;
      },
      shouldSetTextContent: function() {
        return false;
      },
      createInstance: function() {
        creates++;
      },
      finalizeInitialChildren: function() {
        return null;
      },
      appendInitialChild: function() {
        return null;
      },
      now: function() {
        return 0;
      },
      appendChildToContainer: function() {
        return null;
      },
      clearContainer: function() {},
      getCurrentEventPriority: function() {
        return DefaultEventPriority;
      },
      supportsMutation: true,
    });

    const container = Renderer.createContainer(
      /* root: */ null,
      ConcurrentRoot,
      false,
      null,
    );
    Renderer.act(() => {
      Renderer.updateContainer(
        <a>
          <b />
        </a>,
        container,
        /* parentComponent: */ null,
        /* callback: */ null,
      );
    });
    expect(creates).toBe(2);
  });

  // @gate __DEV__
  it('should send the context to prepareForCommit and resetAfterCommit', () => {
    const rootContext = {};
    const Renderer = ReactFiberReconciler({
      prepareForCommit: function(hostContext) {
        expect(hostContext).toBe(rootContext);
        return null;
      },
      resetAfterCommit: function(hostContext) {
        expect(hostContext).toBe(rootContext);
      },
      getRootHostContext: function() {
        return null;
      },
      getChildHostContext: function() {
        return null;
      },
      shouldSetTextContent: function() {
        return false;
      },
      createInstance: function() {
        return null;
      },
      finalizeInitialChildren: function() {
        return null;
      },
      appendInitialChild: function() {
        return null;
      },
      now: function() {
        return 0;
      },
      appendChildToContainer: function() {
        return null;
      },
      clearContainer: function() {},
      getCurrentEventPriority: function() {
        return DefaultEventPriority;
      },
      supportsMutation: true,
    });

    const container = Renderer.createContainer(
      rootContext,
      ConcurrentRoot,
      false,
      null,
    );
    Renderer.act(() => {
      Renderer.updateContainer(
        <a>
          <b />
        </a>,
        container,
        /* parentComponent: */ null,
        /* callback: */ null,
      );
    });
  });
});
