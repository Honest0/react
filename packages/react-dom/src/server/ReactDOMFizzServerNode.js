/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';
import type {Writable} from 'stream';

import {
  createRequest,
  startWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

function createDrainHandler(destination, request) {
  return () => startFlowing(request);
}

type Controls = {
  // Cancel any pending I/O and put anything remaining into
  // client rendered mode.
  abort(): void,
};

function pipeToNodeWritable(
  children: ReactNodeList,
  destination: Writable,
): Controls {
  const request = createRequest(children, destination);
  destination.on('drain', createDrainHandler(destination, request));
  startWork(request);
  return {
    abort() {
      abort(request);
    },
  };
}

export {pipeToNodeWritable};
