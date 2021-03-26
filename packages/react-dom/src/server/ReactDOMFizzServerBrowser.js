/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import {
  createRequest,
  startWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResponseState,
  createRootFormatContext,
} from './ReactDOMServerFormatConfig';

type Options = {
  identifierPrefix?: string,
  progressiveChunkSize?: number,
  signal?: AbortSignal,
  onReadyToStream?: () => void,
  onCompleteAll?: () => void,
  onError?: (error: mixed) => void,
};

function renderToReadableStream(
  children: ReactNodeList,
  options?: Options,
): ReadableStream {
  let request;
  if (options && options.signal) {
    const signal = options.signal;
    const listener = () => {
      abort(request);
      signal.removeEventListener('abort', listener);
    };
    signal.addEventListener('abort', listener);
  }
  const stream = new ReadableStream({
    start(controller) {
      request = createRequest(
        children,
        controller,
        createResponseState(options ? options.identifierPrefix : undefined),
        createRootFormatContext(), // We call this here in case we need options to initialize it.
        options ? options.progressiveChunkSize : undefined,
        options ? options.onError : undefined,
        options ? options.onCompleteAll : undefined,
        options ? options.onReadyToStream : undefined,
      );
      startWork(request);
    },
    pull(controller) {
      // Pull is called immediately even if the stream is not passed to anything.
      // That's buffering too early. We want to start buffering once the stream
      // is actually used by something so we can give it the best result possible
      // at that point.
      if (stream.locked) {
        startFlowing(request);
      }
    },
    cancel(reason) {},
  });
  return stream;
}

export {renderToReadableStream};
