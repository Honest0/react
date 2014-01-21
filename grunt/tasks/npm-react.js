'use strict';

var grunt = require('grunt');

var src = 'npm-react/';
var dest = 'build/npm-react/';
var modSrc = 'build/modules/';
var lib = dest + 'lib/';

function buildRelease() {
  // delete build/react-core for fresh start
  grunt.file.exists(dest) && grunt.file.delete(dest);

  // mkdir -p build/react-core/lib
  grunt.file.mkdir(lib);

  // Copy npm-react/**/* to build/npm-react
  // and build/modules/**/* to build/react-core/lib
  var mappings = [].concat(
    grunt.file.expandMapping('**/*', dest, {cwd: src}),
    grunt.file.expandMapping('**/*', lib, {cwd: modSrc})
  );
  mappings.forEach(function(mapping) {
    var src = mapping.src[0];
    var dest = mapping.dest;
    if (grunt.file.isDir(src)) {
      grunt.file.mkdir(dest);
    } else {
      grunt.file.copy(src, dest);
    }
  });

  // modify build/react-core/package.json to set version ##
  var pkg = grunt.file.readJSON(dest + 'package.json');
  pkg.version = grunt.config.data.pkg.version;
  grunt.file.write(dest + 'package.json', JSON.stringify(pkg, null, 2));
}

function buildDev() {
  // TODO: same as above except different destination
}

module.exports = {
  buildRelease: buildRelease,
  buildDev: buildDev
};
