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

var React = require('React');
var ReactDOM = require('ReactDOM');
var ReactTestUtils = require('ReactTestUtils');

// Helpers
var testAllPermutations = function(testCases) {
  for (var i = 0; i < testCases.length; i += 2) {
    var renderWithChildren = testCases[i];
    var expectedResultAfterRender = testCases[i + 1];

    for (var j = 0; j < testCases.length; j += 2) {
      var updateWithChildren = testCases[j];
      var expectedResultAfterUpdate = testCases[j + 1];

      var container = document.createElement('div');
      var d = ReactDOM.render(<div>{renderWithChildren}</div>, container);
      expectChildren(d, expectedResultAfterRender);

      d = ReactDOM.render(<div>{updateWithChildren}</div>, container);
      expectChildren(d, expectedResultAfterUpdate);
    }
  }
};

var expectChildren = function(d, children) {
  var outerNode = ReactDOM.findDOMNode(d);
  var textNode;
  if (typeof children === 'string') {
    textNode = outerNode.firstChild;

    if (children === '') {
      expect(textNode != null).toBe(false);
    } else {
      expect(textNode != null).toBe(true);
      expect(textNode.nodeType).toBe(3);
      expect(textNode.data).toBe('' + children);
    }
  } else {
    var openingCommentNode;
    var closingCommentNode;
    var mountIndex = 0;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      if (typeof child === 'string') {
        openingCommentNode = outerNode.childNodes[mountIndex];

        expect(openingCommentNode.nodeType).toBe(8);
        expect(openingCommentNode.nodeValue).toMatch(' react-text: [0-9]+ ');

        if (child === '') {
          textNode = null;
          closingCommentNode = openingCommentNode.nextSibling;
          mountIndex += 2;
        } else {
          textNode = openingCommentNode.nextSibling;
          closingCommentNode = textNode.nextSibling;
          mountIndex += 3;
        }

        if (textNode) {
          expect(textNode.nodeType).toBe(3);
          expect(textNode.data).toBe('' + child);
        }

        expect(closingCommentNode.nodeType).toBe(8);
        expect(closingCommentNode.nodeValue).toBe(' /react-text ');
      } else {
        var elementDOMNode = outerNode.childNodes[mountIndex];
        expect(elementDOMNode.tagName).toBe('DIV');
        mountIndex++;
      }
    }
  }
};


/**
 * ReactMultiChild DOM integration test. In ReactDOM components, we make sure
 * that single children that are strings are treated as "content" which is much
 * faster to render and update.
 */
describe('ReactMultiChildText', function() {
  it('should correctly handle all possible children for render and update', function() {
    spyOn(console, 'error');
    testAllPermutations([
      // basic values
      undefined, [],
      null, [],
      false, [],
      true, [],
      0, '0',
      1.2, '1.2',
      '', '',
      'foo', 'foo',

      [], [],
      [undefined], [],
      [null], [],
      [false], [],
      [true], [],
      [0], ['0'],
      [1.2], ['1.2'],
      [''], [''],
      ['foo'], ['foo'],
      [<div />], [<div />],

      // two adjacent values
      [true, 0], ['0'],
      [0, 0], ['0', '0'],
      [1.2, 0], ['1.2', '0'],
      [0, ''], ['0', ''],
      ['foo', 0], ['foo', '0'],
      [0, <div />], ['0', <div />],

      [true, 1.2], ['1.2'],
      [1.2, 0], ['1.2', '0'],
      [1.2, 1.2], ['1.2', '1.2'],
      [1.2, ''], ['1.2', ''],
      ['foo', 1.2], ['foo', '1.2'],
      [1.2, <div />], ['1.2', <div />],

      [true, ''], [''],
      ['', 0], ['', '0'],
      [1.2, ''], ['1.2', ''],
      ['', ''], ['', ''],
      ['foo', ''], ['foo', ''],
      ['', <div />], ['', <div />],

      [true, 'foo'], ['foo'],
      ['foo', 0], ['foo', '0'],
      [1.2, 'foo'], ['1.2', 'foo'],
      ['foo', ''], ['foo', ''],
      ['foo', 'foo'], ['foo', 'foo'],
      ['foo', <div />], ['foo', <div />],

      // values separated by an element
      [true, <div />, true], [<div />],
      [1.2, <div />, 1.2], ['1.2', <div />, '1.2'],
      ['', <div />, ''], ['', <div />, ''],
      ['foo', <div />, 'foo'], ['foo', <div />, 'foo'],

      [true, 1.2, <div />, '', 'foo'], ['1.2', <div />, '', 'foo'],
      [1.2, '', <div />, 'foo', true], ['1.2', '', <div />, 'foo'],
      ['', 'foo', <div />, true, 1.2], ['', 'foo', <div />, '1.2'],

      [true, 1.2, '', <div />, 'foo', true, 1.2], ['1.2', '', <div />, 'foo', '1.2'],
      ['', 'foo', true, <div />, 1.2, '', 'foo'], ['', 'foo', <div />, '1.2', '', 'foo'],

      // values inside arrays
      [[true], [true]], [],
      [[1.2], [1.2]], ['1.2', '1.2'],
      [[''], ['']], ['', ''],
      [['foo'], ['foo']], ['foo', 'foo'],
      [[<div />], [<div />]], [<div />, <div />],

      [[true, 1.2, <div />], '', 'foo'], ['1.2', <div />, '', 'foo'],
      [1.2, '', [<div />, 'foo', true]], ['1.2', '', <div />, 'foo'],
      ['', ['foo', <div />, true], 1.2], ['', 'foo', <div />, '1.2'],

      [true, [1.2, '', <div />, 'foo'], true, 1.2], ['1.2', '', <div />, 'foo', '1.2'],
      ['', 'foo', [true, <div />, 1.2, ''], 'foo'], ['', 'foo', <div />, '1.2', '', 'foo'],

      // values inside elements
      [<div>{true}{1.2}{<div />}</div>, '', 'foo'], [<div />, '', 'foo'],
      [1.2, '', <div>{<div />}{'foo'}{true}</div>], ['1.2', '', <div />],
      ['', <div>{'foo'}{<div />}{true}</div>, 1.2], ['', <div />, '1.2'],

      [true, <div>{1.2}{''}{<div />}{'foo'}</div>, true, 1.2], [<div />, '1.2'],
      ['', 'foo', <div>{true}{<div />}{1.2}{''}</div>, 'foo'], ['', 'foo', <div />, 'foo'],
    ]);
    expect(console.error.calls.count()).toBe(1);
    expect(console.error.calls.argsFor(0)[0]).toContain(
      'Warning: Each child in an array or iterator should have a unique "key" prop.'
    );
  });

  it('should throw if rendering both HTML and children', function() {
    expect(function() {
      ReactTestUtils.renderIntoDocument(
        <div dangerouslySetInnerHTML={{__html: 'abcdef'}}>ghjkl</div>
      );
    }).toThrow();
  });

  it('should render between nested components and inline children', function() {
    ReactTestUtils.renderIntoDocument(<div><h1><span /><span /></h1></div>);

    expect(function() {
      ReactTestUtils.renderIntoDocument(<div><h1>A</h1></div>);
    }).not.toThrow();

    expect(function() {
      ReactTestUtils.renderIntoDocument(<div><h1>{['A']}</h1></div>);
    }).not.toThrow();

    expect(function() {
      ReactTestUtils.renderIntoDocument(<div><h1>{['A', 'B']}</h1></div>);
    }).not.toThrow();
  });

  it('should reorder keyed text nodes', function() {
    spyOn(console, 'error');

    var container = document.createElement('div');
    ReactDOM.render(
      <div>{new Map([['a', 'alpha'], ['b', 'beta']])}</div>,
      container
    );

    var childNodes = container.firstChild.childNodes;
    var alpha1 = childNodes[0];
    var alpha2 = childNodes[1];
    var alpha3 = childNodes[2];
    var beta1 = childNodes[3];
    var beta2 = childNodes[4];
    var beta3 = childNodes[5];

    ReactDOM.render(
      <div>{new Map([['b', 'beta'], ['a', 'alpha']])}</div>,
      container
    );

    childNodes = container.firstChild.childNodes;
    expect(childNodes[0]).toBe(beta1);
    expect(childNodes[1]).toBe(beta2);
    expect(childNodes[2]).toBe(beta3);
    expect(childNodes[3]).toBe(alpha1);
    expect(childNodes[4]).toBe(alpha2);
    expect(childNodes[5]).toBe(alpha3);

    // Using Maps as children gives a single warning
    expect(console.error.calls.count()).toBe(1);
  });
});
