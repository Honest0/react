#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const {existsSync} = require('fs');
const {join} = require('path');
const {getArtifactsList, logPromise} = require('../utils');
const theme = require('../theme');

const run = async ({build, cwd, releaseChannel}) => {
  const artifacts = await getArtifactsList(build);
  const buildArtifacts = artifacts.find(entry =>
    entry.path.endsWith('build2.tgz')
  );

  if (!buildArtifacts) {
    console.log(
      theme`{error The specified build (${build}) does not contain any build artifacts.}`
    );
    process.exit(1);
  }

  // Download and extract artifact
  await exec(`rm -rf ./build2`, {cwd});
  await exec(
    `curl -L $(fwdproxy-config curl) ${buildArtifacts.url} | tar -xvz`,
    {
      cwd,
    }
  );

  // Copy to staging directory
  // TODO: Consider staging the release in a different directory from the CI
  // build artifacts: `./build/node_modules` -> `./staged-releases`
  if (!existsSync(join(cwd, 'build'))) {
    await exec(`mkdir ./build`, {cwd});
  } else {
    await exec(`rm -rf ./build/node_modules`, {cwd});
  }
  let sourceDir;
  if (releaseChannel === 'stable') {
    sourceDir = 'oss-stable';
  } else if (releaseChannel === 'experimental') {
    sourceDir = 'oss-experimental';
  } else {
    console.error('Internal error: Invalid release channel: ' + releaseChannel);
    process.exit(releaseChannel);
  }
  await exec(`cp -r ./build2/${sourceDir} ./build/node_modules`, {cwd});
};

module.exports = async ({build, cwd, releaseChannel}) => {
  return logPromise(
    run({build, cwd, releaseChannel}),
    theme`Downloading artifacts from Circle CI for build {build ${build}}`
  );
};
