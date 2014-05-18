'use strict';

var visitors = require('./vendor/fbtransform/visitors');
var transform = require('jstransform').transform;
var Buffer = require('buffer').Buffer;

module.exports = {
  React: React,
  transform: function(input, options) {
    options = options || {};
    var visitorList = getVisitors(options.harmony);
    var result = transform(visitorList, input, options);
    var output = result.code;
    if (options.sourceMap) {
      var map = inlineSourceMap(
        result.sourceMap,
        input,
        options.sourceFilename
      );
      output += '\n' + map;
    }
    return output;
  }
};

function getVisitors(harmony) {
  if (harmony) {
    return visitors.getAllVisitors();
  } else {
    return visitors.transformVisitors.react;
  }
}

function inlineSourceMap(sourceMap, sourceCode, sourceFilename) {
  var json = sourceMap.toJSON();
  json.sources = [sourceFilename];
  json.sourcesContent = [sourceCode];
  var base64 = Buffer(JSON.stringify(json)).toString('base64');
  return '//# sourceMappingURL=data:application/json;base64,' +
         base64;
}
