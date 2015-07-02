'use strict';

var grunt = require('grunt');

// Check that the version we're exporting is the same one we expect in the
// package. This is not an ideal way to do this, but makes sure that we keep
// them in sync.
var reactVersionExp = /\bReact\.version\s*=\s*['"]([^'"]+)['"];/;

module.exports = function() {
  var pkgVersion = grunt.config.data.pkg.version;

  var addonsData = grunt.file.readJSON('./packages/react-addons/package.json');
  var versions = {
    'packages/react/package.json':
      grunt.file.readJSON('./packages/react/package.json').version,
    'packages/react-dom/package.json':
      grunt.file.readJSON('./packages/react-dom/package.json').version,
    'packages/react-addons/package.json (version)': addonsData.version,
    // Get the "version" without the range bit
    'packages/react-addons/package.json (react dependency)': addonsData.peerDependencies.react.slice(1),
    'src/React.js': reactVersionExp.exec(grunt.file.read('./src/React.js'))[1],
  };

  // Return true (ok) or false (failed)
  return Object.keys(versions).reduce(function(prev, name) {
    var version = versions[name];
    var ok = true;
    if (version !== pkgVersion) {
      grunt.log.error(
        '%s version does not match package.json. Expected %s, saw %s.',
        name,
        pkgVersion,
        version
      );
      ok = false;
    }
    return prev && ok;
  }, true);
};
