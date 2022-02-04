'use strict';

module.exports = {
  env: {
    commonjs: true,
    browser: true,
  },
  globals: {
    // ES6
    Map: 'readonly',
    Set: 'readonly',
    Symbol: 'readonly',
    Proxy: 'readonly',
    WeakMap: 'readonly',
    WeakSet: 'readonly',
    Reflect: 'readonly',
    // Vendor specific
    MSApp: 'readonly',
    __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
    // FB
    __DEV__: 'readonly',
    // Fabric. See https://github.com/facebook/react/pull/15490
    // for more information
    nativeFabricUIManager: 'readonly',
    // Trusted Types
    trustedTypes: 'readonly',
    // RN supports this
    setImmediate: 'readonly',
    // Scheduler profiling
    Int32Array: 'readonly',
    ArrayBuffer: 'readonly',

    TaskController: 'readonly',
    reportError: 'readonly',

    // jest
    jest: 'readonly',

    // act
    IS_REACT_ACT_ENVIRONMENT: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'script',
  },
  rules: {
    'no-undef': 'error',
    'no-shadow-restricted-names': 'error',
  },

  // These plugins aren't used, but eslint complains if an eslint-ignore comment
  // references unused plugins. An alternate approach could be to strip
  // eslint-ignore comments as part of the build.
  plugins: ['jest', 'no-for-of-loops', 'react', 'react-internal'],
};
