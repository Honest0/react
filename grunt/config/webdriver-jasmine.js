var grunt = require('grunt');


exports.local = {
  webdriver: {
    remote: { protocol: 'http:', hostname: '127.0.0.1', port: 9515, path: '/' }
  },
  url: "http://127.0.0.1:9999/test/index.html",
  onComplete: function(report){
    if (!report.passed){
      grunt.fatal("tests failed");
    }
  },
  onError: function(error){
    grunt.fatal(error);
  }
}


exports.saucelabs = {
  webdriver: {
    remote: {
      /* https://github.com/admc/wd/blob/master/README.md#named-parameters */
      user: process.env.SAUCE_USERNAME,
      pwd: process.env.SAUCE_ACCESS_KEY,

      protocol: 'http:',
      hostname: 'ondemand.saucelabs.com',
      port: '80',
      path: '/wd/hub'
    }
  },
  desiredCapabilities: {
    "build": process.env.TRAVIS_BUILD_NUMBER,
    "tunnel-identifier": process.env.TRAVIS_JOB_NUMBER || 'my awesome tunnel',
    "browserName": "chrome"
  },
  url: exports.local.url,
  onStart: function(browser){
    grunt.log.writeln("Starting WebDriver Test. Watch results here: http://saucelabs.com/tests/" + browser.sessionID);
  },
  onComplete: exports.local.onComplete,
  onError: exports.local.onError
}
