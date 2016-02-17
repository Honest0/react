'use strict';

// React's test can only work in NODE_ENV=test because of how things
// are set up. So we might as well enforce it.
process.env.NODE_ENV = 'test';

var path = require('path');

var babel = require('babel');
var coffee = require('coffee-script');

var tsPreprocessor = require('./ts-preprocessor');

// This assumes the module map has been built. This might not be safe.
// We should consider consuming this from a built fbjs module from npm.
var moduleMap = require('fbjs/module-map');
var babelPluginDEV = require('fbjs-scripts/babel/dev-expression');
var babelPluginModules = require('fbjs-scripts/babel/rewrite-modules');
var createCacheKeyFunction = require('fbjs-scripts/jest/createCacheKeyFunction');

// Use require.resolve to be resilient to file moves, npm updates, etc
var pathToBabel = path.join(require.resolve('babel'), '..', 'package.json');
var pathToModuleMap = require.resolve('fbjs/module-map');
var pathToBabelPluginDev = require.resolve('fbjs-scripts/babel/dev-expression');
var pathToBabelPluginModules = require.resolve('fbjs-scripts/babel/rewrite-modules');

// TODO: make sure this stays in sync with gulpfile
var babelOptions = {
  nonStandard: true,
  blacklist: [
    'spec.functionName',
    'validation.react',
  ],
  optional: [
    'es7.trailingFunctionCommas',
  ],
  plugins: [babelPluginDEV, babelPluginModules],
  retainLines: true,
  _moduleMap: moduleMap,
};

module.exports = {
  process: function(src, filePath) {
    if (filePath.match(/\.coffee$/)) {
      return coffee.compile(src, {'bare': true});
    }
    if (filePath.match(/\.ts$/) && !filePath.match(/\.d\.ts$/)) {
      return tsPreprocessor.compile(src, filePath);
    }
    if (
      !filePath.match(/\/node_modules\//) &&
      !filePath.match(/\/third_party\//)
    ) {
      return babel.transform(
        src,
        Object.assign({filename: filePath}, babelOptions)
      ).code;
    }
    return src;
  },

  getCacheKey: createCacheKeyFunction([
    __filename,
    pathToBabel,
    pathToModuleMap,
    pathToBabelPluginDev,
    pathToBabelPluginModules,
  ]),
};
