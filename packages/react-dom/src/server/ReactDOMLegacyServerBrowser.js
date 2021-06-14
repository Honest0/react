/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';
import invariant from 'shared/invariant';

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
} from './ReactDOMServerLegacyFormatConfig';

type ServerOptions = {
  identifierPrefix?: string,
};

function onError() {
  // Non-fatal errors are ignored.
}

function renderToStringImpl(
  children: ReactNodeList,
  options: void | ServerOptions,
  generateStaticMarkup: boolean,
): string {
  let didFatal = false;
  let fatalError = null;
  let result = '';
  const destination = {
    push(chunk) {
      if (chunk !== null) {
        result += chunk;
      }
      return true;
    },
    destroy(error) {
      didFatal = true;
      fatalError = error;
    },
  };

  let readyToStream = false;
  function onReadyToStream() {
    readyToStream = true;
  }
  const request = createRequest(
    children,
    destination,
    createResponseState(
      generateStaticMarkup,
      options ? options.identifierPrefix : undefined,
    ),
    createRootFormatContext(),
    Infinity,
    onError,
    undefined,
    onReadyToStream,
  );
  startWork(request);
  // If anything suspended and is still pending, we'll abort it before writing.
  // That way we write only client-rendered boundaries from the start.
  abort(request);
  startFlowing(request);
  if (didFatal) {
    throw fatalError;
  }
  invariant(
    readyToStream,
    'A React component suspended while rendering, but no fallback UI was specified.\n' +
      '\n' +
      'Add a <Suspense fallback=...> component higher in the tree to ' +
      'provide a loading indicator or placeholder to display.',
  );
  return result;
}

function renderToString(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(children, options, false);
}

function renderToStaticMarkup(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(children, options, true);
}

function renderToNodeStream() {
  invariant(
    false,
    'ReactDOMServer.renderToNodeStream(): The streaming API is not available ' +
      'in the browser. Use ReactDOMServer.renderToString() instead.',
  );
}

function renderToStaticNodeStream() {
  invariant(
    false,
    'ReactDOMServer.renderToStaticNodeStream(): The streaming API is not available ' +
      'in the browser. Use ReactDOMServer.renderToStaticMarkup() instead.',
  );
}

export {
  renderToString,
  renderToStaticMarkup,
  renderToNodeStream,
  renderToStaticNodeStream,
  ReactVersion as version,
};
