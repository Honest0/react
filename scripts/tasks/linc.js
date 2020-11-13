/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const minimist = require('minimist');
const runESLint = require('../eslint');

console.log('Linting changed files...');

const cliOptions = minimist(process.argv.slice(2));
if (runESLint({onlyChanged: true, ...cliOptions})) {
  console.log('Lint passed for changed files.');
} else {
  console.log('Lint failed for changed files.');
  process.exit(1);
}
