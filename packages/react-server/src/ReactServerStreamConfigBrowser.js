/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type Destination = ReadableStreamController;

export function scheduleWork(callback: () => void) {
  callback();
}

export function flushBuffered(destination: Destination) {
  // WHATWG Streams do not yet have a way to flush the underlying
  // transform streams. https://github.com/whatwg/streams/issues/960
}

export function beginWriting(destination: Destination) {}

export function writeChunk(
  destination: Destination,
  buffer: Uint8Array,
): boolean {
  destination.enqueue(buffer);
  return destination.desiredSize > 0;
}

export function completeWriting(destination: Destination) {}

export function close(destination: Destination) {
  destination.close();
}

const textEncoder = new TextEncoder();

export function convertStringToBuffer(content: string): Uint8Array {
  return textEncoder.encode(content);
}

export function closeWithError(destination: Destination, error: mixed): void {
  if (typeof destination.error === 'function') {
    // $FlowFixMe: This is an Error object or the destination accepts other types.
    destination.error(error);
  } else {
    // Earlier implementations doesn't support this method. In that environment you're
    // supposed to throw from a promise returned but we don't return a promise in our
    // approach. We could fork this implementation but this is environment is an edge
    // case to begin with. It's even less common to run this in an older environment.
    // Even then, this is not where errors are supposed to happen and they get reported
    // to a global callback in addition to this anyway. So it's fine just to close this.
    destination.close();
  }
}
