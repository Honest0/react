#!/usr/bin/env node

'use strict';

const commandLineArgs = require('command-line-args');
const getBuildIdForCommit = require('./get-build-id-for-commit');
const theme = require('../theme');
const {logPromise} = require('../utils');

const paramDefinitions = [
  {
    name: 'build',
    type: String,
    description:
      'CI build ID corresponding to the "process_artifacts_combined" task.',
    defaultValue: null,
  },
  {
    name: 'commit',
    type: String,
    description:
      'GitHub commit SHA. When provided, automatically finds corresponding CI build.',
    defaultValue: null,
  },
  {
    name: 'skipTests',
    type: Boolean,
    description: 'Skip automated fixture tests.',
    defaultValue: false,
  },
  {
    name: 'releaseChannel',
    alias: 'r',
    type: String,
    description: 'Release channel (stable or experimental)',
  },
];

module.exports = async () => {
  const params = commandLineArgs(paramDefinitions);

  const channel = params.releaseChannel;
  if (channel !== 'experimental' && channel !== 'stable') {
    console.error(
      theme.error`Invalid release channel (-r) "${channel}". Must be "stable" or "experimental".`
    );
    process.exit(1);
  }

  if (params.build === null && params.commit === null) {
    console.error(
      theme.error`Either a --commit or --build param must be specified.`
    );
    process.exit(1);
  }

  try {
    if (params.build === null) {
      params.build = await logPromise(
        getBuildIdForCommit(params.commit),
        theme`Getting build ID for commit "${params.commit}"`
      );
    }
  } catch (error) {
    console.error(theme.error(error));
    process.exit(1);
  }

  return params;
};
