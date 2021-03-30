/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * This is a renderer of React that doesn't have a render target output.
 * It is useful to demonstrate the internals of the reconciler in isolation
 * and for testing semantics of reconciliation separate from the host
 * environment.
 */

import type {ReactModel} from 'react-server/src/ReactFlightServer';

import {saveModule} from 'react-noop-renderer/flight-modules';

import ReactFlightServer from 'react-server/flight';

type Destination = Array<string>;

const ReactNoopFlightServer = ReactFlightServer({
  scheduleWork(callback: () => void) {
    callback();
  },
  beginWriting(destination: Destination): void {},
  writeChunk(destination: Destination, chunk: string): void {
    destination.push(chunk);
  },
  completeWriting(destination: Destination): void {},
  close(destination: Destination): void {},
  closeWithError(destination: Destination, error: mixed): void {},
  flushBuffered(destination: Destination): void {},
  stringToChunk(content: string): string {
    return content;
  },
  stringToPrecomputedChunk(content: string): string {
    return content;
  },
  isModuleReference(reference: Object): boolean {
    return reference.$$typeof === Symbol.for('react.module.reference');
  },
  getModuleKey(reference: Object): Object {
    return reference;
  },
  resolveModuleMetaData(
    config: void,
    reference: {$$typeof: Symbol, value: any},
  ) {
    return saveModule(reference.value);
  },
});

type Options = {
  onError?: (error: mixed) => void,
};

function render(model: ReactModel, options?: Options): Destination {
  const destination: Destination = [];
  const bundlerConfig = undefined;
  const request = ReactNoopFlightServer.createRequest(
    model,
    destination,
    bundlerConfig,
    options ? options.onError : undefined,
  );
  ReactNoopFlightServer.startWork(request);
  return destination;
}

export {render};
