'use strict';

const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  modulePathIgnorePatterns: [
    ...baseConfig.modulePathIgnorePatterns,
    'packages/react-devtools-shared',
  ],
  setupFiles: [
    ...baseConfig.setupFiles,
    require.resolve('./setupTests.www.js'),
    require.resolve('./setupHostConfigs.js'),
  ],
});
