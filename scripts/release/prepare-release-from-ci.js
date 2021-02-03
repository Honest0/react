#!/usr/bin/env node

'use strict';

const {join} = require('path');
const {addDefaultParamValue, handleError} = require('./utils');

const checkEnvironmentVariables = require('./shared-commands/check-environment-variables');
const downloadBuildArtifacts = require('./shared-commands/download-build-artifacts');
const parseParams = require('./shared-commands/parse-params');
const printPrereleaseSummary = require('./shared-commands/print-prerelease-summary');
const testPackagingFixture = require('./shared-commands/test-packaging-fixture');
const testTracingFixture = require('./shared-commands/test-tracing-fixture');

const run = async () => {
  try {
    addDefaultParamValue(null, '--commit', 'master');

    const params = await parseParams();
    params.cwd = join(__dirname, '..', '..');

    await checkEnvironmentVariables(params);
    await downloadBuildArtifacts(params);

    if (!params.skipTests) {
      await testPackagingFixture(params);
      await testTracingFixture(params);
    }

    await printPrereleaseSummary(params, false);
  } catch (error) {
    handleError(error);
  }
};

run();
