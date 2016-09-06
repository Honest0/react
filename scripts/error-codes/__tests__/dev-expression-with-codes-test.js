/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
/* eslint-disable quotes */
'use strict';

let babel = require('babel-core');
let devExpressionWithCodes = require('../dev-expression-with-codes');

function transform(input) {
  return babel.transform(input, {
    plugins: [devExpressionWithCodes],
  }).code;
}

function compare(input, output) {
  var compiled = transform(input);
  expect(compiled).toEqual(output);
}

var oldEnv;

describe('dev-expression', () => {
  beforeEach(() => {
    oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = '';
  });

  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
  });

  it('should replace __DEV__ in if', () => {
    compare(
`
if (__DEV__) {
  console.log('foo')
}`,
`
if (process.env.NODE_ENV !== 'production') {
  console.log('foo');
}`
    );
  });

  it('should replace warning calls', () => {
    compare(
      "warning(condition, 'a %s b', 'c');",
      "process.env.NODE_ENV !== 'production' ? warning(condition, 'a %s b', 'c') : void 0;"
    );
  });

  it("should add `reactProdInvariant` when it finds `require('invariant')`", () => {
    compare(
"var invariant = require('invariant');",

`var _prodInvariant = require('reactProdInvariant');

var invariant = require('invariant');`
    );
  });

  it('should replace simple invariant calls', () => {
    compare(
      "invariant(condition, 'Do not override existing functions.');",
      "var _prodInvariant = require('reactProdInvariant');\n\n" +
      "!condition ? " +
      "process.env.NODE_ENV !== 'production' ? " +
      "invariant(false, 'Do not override existing functions.') : " +
      `_prodInvariant('16') : void 0;`
    );
  });

  it("should only add `reactProdInvariant` once", () => {
    var expectedInvariantTransformResult = (
      "!condition ? " +
      "process.env.NODE_ENV !== 'production' ? " +
      "invariant(false, 'Do not override existing functions.') : " +
      `_prodInvariant('16') : void 0;`
    );

    compare(
`var invariant = require('invariant');
invariant(condition, 'Do not override existing functions.');
invariant(condition, 'Do not override existing functions.');`,

`var _prodInvariant = require('reactProdInvariant');

var invariant = require('invariant');
${expectedInvariantTransformResult}
${expectedInvariantTransformResult}`
    );
  });

  it('should support invariant calls with args', () => {
    compare(
      "invariant(condition, 'Expected %s target to be an array; got %s', 'foo', 'bar');",
      "var _prodInvariant = require('reactProdInvariant');\n\n" +
      "!condition ? " +
      "process.env.NODE_ENV !== 'production' ? " +
      "invariant(false, 'Expected %s target to be an array; got %s', 'foo', 'bar') : " +
      `_prodInvariant('7', 'foo', 'bar') : void 0;`
    );
  });

  it('should support invariant calls with a concatenated template string and args', () => {
    compare(
      "invariant(condition, 'Expected a component class, ' + 'got %s.' + '%s', 'Foo', 'Bar');",
      "var _prodInvariant = require('reactProdInvariant');\n\n" +
      "!condition ? " +
      "process.env.NODE_ENV !== 'production' ? " +
      "invariant(false, 'Expected a component class, got %s.%s', 'Foo', 'Bar') : " +
      `_prodInvariant('18', 'Foo', 'Bar') : void 0;`
    );
  });

  it('should warn in non-test envs if the error message cannot be found', () => {
    spyOn(console, 'warn');
    transform("invariant(condition, 'a %s b', 'c');");

    expect(console.warn.calls.count()).toBe(1);
    expect(console.warn.calls.argsFor(0)[0]).toBe(
      'Error message "a %s b" ' +
      'cannot be found. The current React version ' +
      'and the error map are probably out of sync. ' +
      'Please run `gulp react:extract-errors` before building React.'
    );
  });

  it('should not warn in test env if the error message cannot be found', () => {
    process.env.NODE_ENV = 'test';

    spyOn(console, 'warn');
    transform("invariant(condition, 'a %s b', 'c');");

    expect(console.warn.calls.count()).toBe(0);

    process.env.NODE_ENV = '';
  });
});
