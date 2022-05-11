/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const semver = require('semver');

let shouldPass;
let isFocused;
describe('transform-react-version-pragma', () => {
  // eslint-disable-next-line no-unused-vars
  const _test_react_version = (range, testName, cb) => {
    test(testName, (...args) => {
      shouldPass = semver.satisfies('18.0.0', range);
      return cb(...args);
    });
  };

  // eslint-disable-next-line no-unused-vars
  const _test_react_version_focus = (range, testName, cb) => {
    test(testName, (...args) => {
      shouldPass = semver.satisfies('18.0.0', range);
      isFocused = true;
      return cb(...args);
    });
  };

  beforeEach(() => {
    shouldPass = null;
    isFocused = false;
  });

  // @reactVersion >= 17.9
  test('reactVersion flag is on >=', () => {
    expect(shouldPass).toBe(true);
  });

  // @reactVersion >= 18.1
  test('reactVersion flag is off >=', () => {
    expect(shouldPass).toBe(false);
  });

  // @reactVersion <= 18.1
  test('reactVersion flag is on <=', () => {
    expect(shouldPass).toBe(true);
  });

  // @reactVersion <= 17.9
  test('reactVersion flag is off <=', () => {
    expect(shouldPass).toBe(false);
  });

  // @reactVersion > 17.9
  test('reactVersion flag is on >', () => {
    expect(shouldPass).toBe(true);
  });

  // @reactVersion > 18.1
  test('reactVersion flag is off >', () => {
    expect(shouldPass).toBe(false);
  });

  // @reactVersion < 18.1
  test('reactVersion flag is on <', () => {
    expect(shouldPass).toBe(true);
  });

  // @reactVersion < 17.0.0
  test('reactVersion flag is off <', () => {
    expect(shouldPass).toBe(false);
  });

  // @reactVersion = 18.0
  test('reactVersion flag is on =', () => {
    expect(shouldPass).toBe(true);
  });

  // @reactVersion = 18.1
  test('reactVersion flag is off =', () => {
    expect(shouldPass).toBe(false);
  });

  /* eslint-disable jest/no-focused-tests */

  // @reactVersion >= 18.1
  fit('reactVersion fit', () => {
    expect(shouldPass).toBe(false);
    expect(isFocused).toBe(true);
  });

  // @reactVersion <= 18.1
  test.only('reactVersion test.only', () => {
    expect(shouldPass).toBe(true);
    expect(isFocused).toBe(true);
  });

  // @reactVersion <= 18.1
  // @reactVersion <= 17.1
  test('reactVersion multiple pragmas fail', () => {
    expect(shouldPass).toBe(false);
    expect(isFocused).toBe(false);
  });

  // @reactVersion <= 18.1
  // @reactVersion >= 17.1
  test('reactVersion multiple pragmas pass', () => {
    expect(shouldPass).toBe(true);
    expect(isFocused).toBe(false);
  });

  // @reactVersion <= 18.1
  // @reactVersion <= 17.1
  test.only('reactVersion focused multiple pragmas fail', () => {
    expect(shouldPass).toBe(false);
    expect(isFocused).toBe(true);
  });

  // @reactVersion <= 18.1
  // @reactVersion >= 17.1
  test.only('reactVersion focused multiple pragmas pass', () => {
    expect(shouldPass).toBe(true);
    expect(isFocused).toBe(true);
  });
});
