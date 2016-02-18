/**
 * Copyright 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMComponentTree', function() {
  var React;
  var ReactDOM;
  var ReactDOMComponentTree;
  var ReactDOMServer;

  function renderMarkupIntoDocument(elt) {
    var container = document.createElement('div');
    // Force server-rendering path:
    container.innerHTML = ReactDOMServer.renderToString(elt);
    return ReactDOM.render(elt, container);
  }

  beforeEach(function() {
    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMComponentTree = require('ReactDOMComponentTree');
    ReactDOMServer = require('ReactDOMServer');
  });

  it('finds nodes for instances', function() {
    // This is a little hard to test directly. But refs rely on it -- so we
    // check that we can find a ref at arbitrary points in the tree, even if
    // other nodes don't have a ref.
    var Component = React.createClass({
      render: function() {
        var toRef = this.props.toRef;
        return (
          <div ref={toRef === 'div' ? 'target' : null}>
            <h1 ref={toRef === 'h1' ? 'target' : null}>hello</h1>
            <p ref={toRef === 'p' ? 'target' : null}>
              <input ref={toRef === 'input' ? 'target' : null} />
            </p>
            goodbye.
          </div>
        );
      },
    });

    function renderAndGetRef(toRef) {
      var inst = renderMarkupIntoDocument(<Component toRef={toRef} />);
      return inst.refs.target.nodeName;
    }

    expect(renderAndGetRef('div')).toBe('DIV');
    expect(renderAndGetRef('h1')).toBe('H1');
    expect(renderAndGetRef('p')).toBe('P');
    expect(renderAndGetRef('input')).toBe('INPUT');
  });

  it('finds instances for nodes', function() {
    var Component = React.createClass({
      render: function() {
        return (
          <div>
            <h1>hello</h1>
            <p>
              <input />
            </p>
            goodbye.
            <main dangerouslySetInnerHTML={{__html: '<b><img></b>'}} />
          </div>
        );
      },
    });

    function renderAndQuery(sel) {
      var root = renderMarkupIntoDocument(<section><Component /></section>);
      return sel ? root.querySelector(sel) : root;
    }

    function renderAndGetInstance(sel) {
      return ReactDOMComponentTree.getInstanceFromNode(renderAndQuery(sel));
    }

    function renderAndGetClosest(sel) {
      return ReactDOMComponentTree.getClosestInstanceFromNode(
        renderAndQuery(sel)
      );
    }

    expect(renderAndGetInstance(null)._currentElement.type).toBe('section');
    expect(renderAndGetInstance('div')._currentElement.type).toBe('div');
    expect(renderAndGetInstance('h1')._currentElement.type).toBe('h1');
    expect(renderAndGetInstance('p')._currentElement.type).toBe('p');
    expect(renderAndGetInstance('input')._currentElement.type).toBe('input');
    expect(renderAndGetInstance('main')._currentElement.type).toBe('main');

    // This one's a text component!
    var root = renderAndQuery(null);
    var inst = ReactDOMComponentTree.getInstanceFromNode(root.children[0].childNodes[2]);
    expect(inst._stringText).toBe('goodbye.');

    expect(renderAndGetClosest('b')._currentElement.type).toBe('main');
    expect(renderAndGetClosest('img')._currentElement.type).toBe('main');
  });

});
