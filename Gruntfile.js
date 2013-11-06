'use strict';

var exec = require('child_process').exec;
var jsxTask = require('./grunt/tasks/jsx');
var browserifyTask = require('./grunt/tasks/browserify');
var populistTask = require('./grunt/tasks/populist');
var phantomTask = require('./grunt/tasks/phantom');
var webdriverJasmineTasks = require('./grunt/tasks/webdriver-jasmine.js');
var npmTask = require('./grunt/tasks/npm');
var releaseTasks = require('./grunt/tasks/release');

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: require('./grunt/config/copy'),
    jsx: require('./grunt/config/jsx/jsx'),
    browserify: require('./grunt/config/browserify'),
    populist: require('./grunt/config/populist'),
    phantom: require('./grunt/config/phantom'),
    connect: require('./grunt/config/server')(grunt),
    "webdriver-jasmine": require('./grunt/config/webdriver-jasmine.js'),
    npm: require('./grunt/config/npm'),
    clean: ['./build', './*.gem', './docs/_site', './examples/shared/*.js'],
    jshint: require('./grunt/config/jshint'),
    compare_size: require('./grunt/config/compare_size')
  });

  grunt.config.set('compress', require('./grunt/config/compress'));

  for (var key in grunt.file.readJSON("package.json").devDependencies) {
      if (key !== "grunt" && key.indexOf("grunt") === 0) grunt.loadNpmTasks(key);
  }

  // Alias 'jshint' to 'lint' to better match the workflow we know
  grunt.registerTask('lint', ['jshint']);

  // Register jsx:debug and :release tasks.
  grunt.registerMultiTask('jsx', jsxTask);

  // Our own browserify-based tasks to build a single JS file build
  grunt.registerMultiTask('browserify', browserifyTask);

  grunt.registerMultiTask('populist', populistTask);

  grunt.registerMultiTask('phantom', phantomTask);

  grunt.registerMultiTask('webdriver-jasmine', webdriverJasmineTasks);

  grunt.registerMultiTask('npm', npmTask);

  // Check that the version we're exporting is the same one we expect in the
  // package. This is not an ideal way to do this, but makes sure that we keep
  // them in sync.
  var reactVersionExp = /\bReact\.version\s*=\s*['"]([^'"]+)['"];/;
  grunt.registerTask('version-check', function() {
    var version = reactVersionExp.exec(
      grunt.file.read('./build/modules/React.js')
    )[1];
    var expectedVersion = grunt.config.data.pkg.version;
    if (version !== expectedVersion) {
      grunt.log.error('Versions do not match. Expected %s, saw %s', expectedVersion, version);
      return false;
    }
  });

  grunt.registerTask('build:basic', ['jsx:debug', 'version-check', 'browserify:basic']);
  grunt.registerTask('build:addons', ['jsx:debug', 'browserify:addons']);
  grunt.registerTask('build:transformer', ['jsx:debug', 'browserify:transformer']);
  grunt.registerTask('build:min', ['jsx:release', 'version-check', 'browserify:min']);
  grunt.registerTask('build:addons-min', ['jsx:debug', 'browserify:addonsMin']);
  grunt.registerTask('build:test', [
    'jsx:jasmine',
    'jsx:test',
    'version-check',
    'populist:test'
  ]);

  grunt.registerTask('test:webdriver', [
    'connect',
    'webdriver-jasmine:local'
  ]);
  grunt.registerTask('test', ['build:test', 'build:basic', 'phantom:run']);
  grunt.registerTask('npm:test', ['build', 'npm:pack']);

  // Optimized build task that does all of our builds. The subtasks will be run
  // in order so we can take advantage of that and only run jsx:debug once.
  grunt.registerTask('build', [
    'jsx:debug',
    'version-check',
    'browserify:basic',
    'browserify:transformer',
    'browserify:addons',
    'jsx:release',
    'browserify:min',
    'browserify:addonsMin',
    'copy:react_docs',
    'compare_size'
  ]);

  // Automate the release!
  grunt.registerTask('release:setup', releaseTasks.setup);
  grunt.registerTask('release:bower', releaseTasks.bower);
  grunt.registerTask('release:docs', releaseTasks.docs);
  grunt.registerTask('release:msg', releaseTasks.msg);
  grunt.registerTask('release:starter', releaseTasks.starter);

  grunt.registerTask('release', [
    'release:setup',
    'clean',
    'build',
    'gem:only',
    'release:bower',
    'release:starter',
    'compress',
    'release:docs',
    'release:msg'
  ]);

  // `gem` task to build the react-source gem
  grunt.registerTask('gem', ['build', 'gem:only']);

  grunt.registerTask('gem:only', function() {
    var done = this.async();
    exec('gem build react-source.gemspec', done);
  });

  // The default task - build - to keep setup easy
  grunt.registerTask('default', ['build']);
};
