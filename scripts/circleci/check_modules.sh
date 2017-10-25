#!/bin/bash

set -e

# Make sure we don't introduce accidental @providesModule annotations.
EXPECTED='scripts/rollup/header.js'
ACTUAL=$(git grep -l @providesModule -- './*.js' ':!scripts/rollup/shims/*.js')

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "@providesModule crept into some new files?"
  diff -u <(echo "$EXPECTED") <(echo "$ACTUAL") || true
  exit 1
fi
