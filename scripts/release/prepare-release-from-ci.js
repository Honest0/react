#!/usr/bin/env node

'use strict';

const {join} = require('path');
const {readJsonSync} = require('fs-extra');
const {getPublicPackages, handleError} = require('./utils');

const checkEnvironmentVariables = require('./shared-commands/check-environment-variables');
const downloadBuildArtifacts = require('./shared-commands/download-build-artifacts');
const getLatestMasterBuildNumber = require('./shared-commands/get-latest-master-build-number');
const parseParams = require('./shared-commands/parse-params');
const printPrereleaseSummary = require('./shared-commands/print-prerelease-summary');
const testPackagingFixture = require('./shared-commands/test-packaging-fixture');
const testTracingFixture = require('./shared-commands/test-tracing-fixture');

const run = async () => {
  try {
    const params = parseParams();
    params.cwd = join(__dirname, '..', '..');

    if (!params.build) {
      params.build = await getLatestMasterBuildNumber(false);
    }

    await checkEnvironmentVariables(params);
    await downloadBuildArtifacts(params);

    const version = readJsonSync('./build/node_modules/react/package.json')
      .version;
    const isExperimental = version.includes('experimental');
    params.packages = await getPublicPackages(isExperimental);

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
