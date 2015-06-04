/**
 * Copyright 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

var eslint = require('eslint');
var ESLintTester = require('eslint-tester');
var eslintTester = new ESLintTester(eslint.linter);

eslintTester.addRuleTest('eslint-rules/warning-and-invariant-args', {
  valid: [
    "warning(true, 'hello, world');",
    "warning(true, 'expected %s, got %s', 42, 24);",
    "invariant(true, 'hello, world');",
    "invariant(true, 'expected %s, got %s', 42, 24);",
  ],
  invalid: [
    {
      code: "warning('hello, world');",
      errors: [
        {
          message: 'warning takes at least two arguments',
        },
      ],
    },
    {
      code: 'warning(true, null);',
      errors: [
        {
          message: 'The second argument to warning must be a string literal',
        },
      ],
    },
    {
      code: 'var g = 5; invariant(true, g);',
      errors: [
        {
          message: 'The second argument to invariant must be a string literal',
        },
      ],
    },
    {
      code: "warning(true, 'expected %s, got %s');",
      errors: [
        {
          message: 'Expected 4 arguments in call to warning, but got 2 ' +
                   'based on the number of "%s" substitutions',
        },
      ],
    },
    {
      code: "warning(true, 'foobar', 'junk argument');",
      errors: [
        {
          message: 'Expected 2 arguments in call to warning, but got 3 ' +
                   'based on the number of "%s" substitutions',
        },
      ],
    },
  ],
});

