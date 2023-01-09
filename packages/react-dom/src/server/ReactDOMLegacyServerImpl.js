/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';

import type {ReactNodeList} from 'shared/ReactTypes';
import type {BootstrapScriptDescriptor} from 'react-dom-bindings/src/server/ReactDOMServerFormatConfig';

import {
  createRequest,
  startWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResponseState,
  createRootFormatContext,
} from 'react-dom-bindings/src/server/ReactDOMServerLegacyFormatConfig';

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
  abortReason: string,
  unstable_externalRuntimeSrc?: string | BootstrapScriptDescriptor,
): string {
  let didFatal = false;
  let fatalError = null;
  let result = '';
  const destination = {
    // $FlowFixMe[missing-local-annot]
    push(chunk) {
      if (chunk !== null) {
        result += chunk;
      }
      return true;
    },
    // $FlowFixMe[missing-local-annot]
    destroy(error) {
      didFatal = true;
      fatalError = error;
    },
  };

  let readyToStream = false;
  function onShellReady() {
    readyToStream = true;
  }
  const request = createRequest(
    children,
    createResponseState(
      generateStaticMarkup,
      options ? options.identifierPrefix : undefined,
      unstable_externalRuntimeSrc,
    ),
    createRootFormatContext(),
    Infinity,
    onError,
    undefined,
    onShellReady,
    undefined,
    undefined,
  );
  startWork(request);
  // If anything suspended and is still pending, we'll abort it before writing.
  // That way we write only client-rendered boundaries from the start.
  abort(request, abortReason);
  startFlowing(request, destination);
  if (didFatal && fatalError !== abortReason) {
    throw fatalError;
  }

  if (!readyToStream) {
    // Note: This error message is the one we use on the client. It doesn't
    // really make sense here. But this is the legacy server renderer, anyway.
    // We're going to delete it soon.
    throw new Error(
      'A component suspended while responding to synchronous input. This ' +
        'will cause the UI to be replaced with a loading indicator. To fix, ' +
        'updates that suspend should be wrapped with startTransition.',
    );
  }

  return result;
}

export {renderToStringImpl, ReactVersion as version};
