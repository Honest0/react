/* global chrome */

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {parse} from '@babel/parser';
import {enableHookNameParsing} from 'react-devtools-feature-flags';
import LRU from 'lru-cache';
import {SourceMapConsumer} from 'source-map';
import {getHookName, isNonDeclarativePrimitiveHook} from './astUtils';
import {areSourceMapsAppliedToErrors} from './ErrorTester';
import {__DEBUG__} from 'react-devtools-shared/src/constants';

import type {
  HooksNode,
  HookSource,
  HooksTree,
} from 'react-debug-tools/src/ReactDebugHooks';
import type {HookNames, LRUCache} from 'react-devtools-shared/src/types';
import type {Thenable} from 'shared/ReactTypes';
import type {SourceConsumer} from './astUtils';

const SOURCE_MAP_REGEX = / ?sourceMappingURL=([^\s'"]+)/gm;
const MAX_SOURCE_LENGTH = 100_000_000;

type AST = mixed;

type HookSourceData = {|
  // Generated by react-debug-tools.
  hookSource: HookSource,

  // AST for original source code; typically comes from a consumed source map.
  originalSourceAST: AST | null,

  // Source code (React components or custom hooks) containing primitive hook calls.
  // If no source map has been provided, this code will be the same as runtimeSourceCode.
  originalSourceCode: string | null,

  // Original source URL if there is a source map, or the same as runtimeSourceURL.
  originalSourceURL: string | null,

  // Compiled code (React components or custom hooks) containing primitive hook calls.
  runtimeSourceCode: string | null,

  // Same as hookSource.fileName but guaranteed to be non-null.
  runtimeSourceURL: string,

  // APIs from source-map for parsing source maps (if detected).
  sourceConsumer: SourceConsumer | null,

  // External URL of source map.
  // Sources without source maps (or with inline source maps) won't have this.
  sourceMapURL: string | null,
|};

type CachedRuntimeCodeMetadata = {|
  sourceConsumer: SourceConsumer | null,
|};

const runtimeURLToMetadataCache: LRUCache<
  string,
  CachedRuntimeCodeMetadata,
> = new LRU({
  max: 50,
  dispose: (runtimeSourceURL: string, metadata: CachedRuntimeCodeMetadata) => {
    if (__DEBUG__) {
      console.log(
        `runtimeURLToMetadataCache.dispose() Evicting cached metadata for "${runtimeSourceURL}"`,
      );
    }

    const sourceConsumer = metadata.sourceConsumer;
    if (sourceConsumer !== null) {
      sourceConsumer.destroy();
    }
  },
});

type CachedSourceCodeMetadata = {|
  originalSourceAST: AST,
  originalSourceCode: string,
|};

const originalURLToMetadataCache: LRUCache<
  string,
  CachedSourceCodeMetadata,
> = new LRU({
  max: 50,
  dispose: (originalSourceURL: string, metadata: CachedSourceCodeMetadata) => {
    if (__DEBUG__) {
      console.log(
        `originalURLToMetadataCache.dispose() Evicting cached metadata for "${originalSourceURL}"`,
      );
    }
  },
});

function getLocationKey({
  fileName,
  lineNumber,
  columnNumber,
}: HookSource): string {
  if (fileName == null || lineNumber == null || columnNumber == null) {
    throw Error('Hook source code location not found.');
  }
  return `${fileName}:${lineNumber}:${columnNumber}`;
}

export default async function parseHookNames(
  hooksTree: HooksTree,
): Thenable<HookNames | null> {
  if (!enableHookNameParsing) {
    return Promise.resolve(null);
  }

  const hooksList: Array<HooksNode> = [];
  flattenHooksList(hooksTree, hooksList);

  if (__DEBUG__) {
    console.log('parseHookNames() hooksList:', hooksList);
  }

  // Create map of unique source locations (file names plus line and column numbers) to metadata about hooks.
  const locationKeyToHookSourceData: Map<string, HookSourceData> = new Map();
  for (let i = 0; i < hooksList.length; i++) {
    const hook = hooksList[i];

    const hookSource = hook.hookSource;
    if (hookSource == null) {
      // Older versions of react-debug-tools don't include this information.
      // In this case, we can't continue.
      throw Error('Hook source code location not found.');
    }

    const locationKey = getLocationKey(hookSource);
    if (!locationKeyToHookSourceData.has(locationKey)) {
      // Can't be null because getLocationKey() would have thrown
      const runtimeSourceURL = ((hookSource.fileName: any): string);

      const hookSourceData: HookSourceData = {
        hookSource,
        originalSourceAST: null,
        originalSourceCode: null,
        originalSourceURL: null,
        runtimeSourceCode: null,
        runtimeSourceURL,
        sourceConsumer: null,
        sourceMapURL: null,
      };

      // If we've already loaded the source map info for this file,
      // we can skip reloading it (and more importantly, re-parsing it).
      const runtimeMetadata = runtimeURLToMetadataCache.get(
        hookSourceData.runtimeSourceURL,
      );
      if (runtimeMetadata != null) {
        if (__DEBUG__) {
          console.groupCollapsed(
            `parseHookNames() Found cached runtime metadata for file "${hookSourceData.runtimeSourceURL}"`,
          );
          console.log(runtimeMetadata);
          console.groupEnd();
        }
        hookSourceData.sourceConsumer = runtimeMetadata.sourceConsumer;
      }

      locationKeyToHookSourceData.set(locationKey, hookSourceData);
    }
  }

  return loadSourceFiles(locationKeyToHookSourceData)
    .then(() => extractAndLoadSourceMaps(locationKeyToHookSourceData))
    .then(() => parseSourceAST(locationKeyToHookSourceData))
    .then(() => updateLruCache(locationKeyToHookSourceData))
    .then(() => findHookNames(hooksList, locationKeyToHookSourceData));
}

function decodeBase64String(encoded: string): Object {
  if (typeof atob === 'function') {
    return atob(encoded);
  } else if (
    typeof Buffer !== 'undefined' &&
    Buffer !== null &&
    typeof Buffer.from === 'function'
  ) {
    return Buffer.from(encoded, 'base64');
  } else {
    throw Error('Cannot decode base64 string');
  }
}

function extractAndLoadSourceMaps(
  locationKeyToHookSourceData: Map<string, HookSourceData>,
): Promise<*> {
  // SourceMapConsumer.initialize() does nothing when running in Node (aka Jest)
  // because the wasm file is automatically read from the file system
  // so we can avoid triggering a warning message about this.
  if (!__TEST__) {
    if (__DEBUG__) {
      console.log(
        'extractAndLoadSourceMaps() Initializing source-map library ...',
      );
    }

    // $FlowFixMe
    const wasmMappingsURL = chrome.extension.getURL('mappings.wasm');

    SourceMapConsumer.initialize({'lib/mappings.wasm': wasmMappingsURL});
  }

  // Deduplicate fetches, since there can be multiple location keys per source map.
  const fetchPromises = new Map();

  const setPromises = [];
  locationKeyToHookSourceData.forEach(hookSourceData => {
    if (hookSourceData.sourceConsumer != null) {
      // Use cached source map consumer.
      return;
    }

    const runtimeSourceCode = ((hookSourceData.runtimeSourceCode: any): string);
    const sourceMappingURLs = runtimeSourceCode.match(SOURCE_MAP_REGEX);
    if (sourceMappingURLs == null) {
      // Maybe file has not been transformed; we'll try to parse it as-is in parseSourceAST().

      if (__DEBUG__) {
        console.log('extractAndLoadSourceMaps() No source map found');
      }
    } else {
      for (let i = 0; i < sourceMappingURLs.length; i++) {
        const {runtimeSourceURL} = hookSourceData;
        const sourceMappingURL = sourceMappingURLs[i];
        const index = sourceMappingURL.indexOf('base64,');
        if (index >= 0) {
          // TODO (named hooks) deduplicate parsing in this branch (similar to fetching in the other branch)
          // since there can be multiple location keys per source map.

          // Web apps like Code Sandbox embed multiple inline source maps.
          // In this case, we need to loop through and find the right one.
          // We may also need to trim any part of this string that isn't based64 encoded data.
          const trimmed = ((sourceMappingURL.match(
            /base64,([a-zA-Z0-9+\/=]+)/,
          ): any): Array<string>)[1];
          const decoded = decodeBase64String(trimmed);
          const parsed = JSON.parse(decoded);

          if (__DEBUG__) {
            console.groupCollapsed(
              'extractAndLoadSourceMaps() Inline source map',
            );
            console.log(parsed);
            console.groupEnd();
          }

          // Hook source might be a URL like "https://4syus.csb.app/src/App.js"
          // Parsed source map might be a partial path like "src/App.js"
          const match = parsed.sources.find(
            source =>
              source === 'Inline Babel script' ||
              runtimeSourceURL.endsWith(source),
          );
          if (match) {
            setPromises.push(
              new SourceMapConsumer(parsed).then(sourceConsumer => {
                hookSourceData.sourceConsumer = sourceConsumer;
              }),
            );
            break;
          }
        } else {
          if (sourceMappingURLs.length > 1) {
            console.warn(
              'More than one external source map detected in the source file',
            );
          }

          let url = sourceMappingURLs[i].split('=')[1];
          if (!url.startsWith('http') && !url.startsWith('/')) {
            // Resolve paths relative to the location of the file name
            const lastSlashIdx = runtimeSourceURL.lastIndexOf('/');
            if (lastSlashIdx !== -1) {
              const baseURL = runtimeSourceURL.slice(
                0,
                runtimeSourceURL.lastIndexOf('/'),
              );
              url = `${baseURL}/${url}`;
            }
          }

          hookSourceData.sourceMapURL = url;

          const fetchPromise =
            fetchPromises.get(url) ||
            fetchFile(url).then(
              sourceMapContents =>
                new SourceMapConsumer(JSON.parse(sourceMapContents)),
            );
          if (__DEBUG__) {
            if (!fetchPromises.has(url)) {
              console.log(
                `extractAndLoadSourceMaps() External source map "${url}"`,
              );
            }
          }

          fetchPromises.set(url, fetchPromise);
          setPromises.push(
            fetchPromise.then(sourceConsumer => {
              hookSourceData.sourceConsumer = sourceConsumer;
            }),
          );
          break;
        }
      }
    }
  });
  return Promise.all(setPromises);
}

function fetchFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url).then(response => {
      if (response.ok) {
        response
          .text()
          .then(text => {
            resolve(text);
          })
          .catch(error => {
            if (__DEBUG__) {
              console.log(`fetchFile() Could not read text for url "${url}"`);
            }
            reject(null);
          });
      } else {
        if (__DEBUG__) {
          console.log(`fetchFile() Got bad response for url "${url}"`);
        }
        reject(null);
      }
    });
  });
}

function findHookNames(
  hooksList: Array<HooksNode>,
  locationKeyToHookSourceData: Map<string, HookSourceData>,
): HookNames {
  const map: HookNames = new Map();

  hooksList.map(hook => {
    // TODO (named hooks) We should probably filter before this point,
    // otherwise we are loading and parsing source maps and ASTs for nothing.
    if (isNonDeclarativePrimitiveHook(hook)) {
      if (__DEBUG__) {
        console.log('findHookNames() Non declarative primitive hook');
      }

      // Not all hooks have names (e.g. useEffect or useLayoutEffect)
      return null;
    }

    // We already guard against a null HookSource in parseHookNames()
    const hookSource = ((hook.hookSource: any): HookSource);
    const fileName = hookSource.fileName;
    if (!fileName) {
      return null; // Should not be reachable.
    }

    const locationKey = getLocationKey(hookSource);
    const hookSourceData = locationKeyToHookSourceData.get(locationKey);
    if (!hookSourceData) {
      return null; // Should not be reachable.
    }

    const {lineNumber, columnNumber} = hookSource;
    if (!lineNumber || !columnNumber) {
      return null; // Should not be reachable.
    }

    const sourceConsumer = hookSourceData.sourceConsumer;

    let originalSourceLineNumber;
    if (areSourceMapsAppliedToErrors() || !sourceConsumer) {
      // Either the current environment automatically applies source maps to errors,
      // or the current code had no source map to begin with.
      // Either way, we don't need to convert the Error stack frame locations.
      originalSourceLineNumber = lineNumber;
    } else {
      originalSourceLineNumber = sourceConsumer.originalPositionFor({
        line: lineNumber,

        // Column numbers are representated differently between tools/engines.
        // For more info see https://github.com/facebook/react/issues/21792#issuecomment-873171991
        column: columnNumber - 1,
      }).line;
    }

    if (__DEBUG__) {
      console.log(
        'findHookNames() mapped line number',
        lineNumber,
        'to',
        originalSourceLineNumber,
      );
    }

    if (originalSourceLineNumber === null) {
      return null;
    }

    const name = getHookName(
      hook,
      hookSourceData.originalSourceAST,
      ((hookSourceData.originalSourceCode: any): string),
      ((originalSourceLineNumber: any): number),
    );

    if (__DEBUG__) {
      console.log(`findHookNames() Found name "${name || '-'}"`);
    }

    map.set(hook, name);
  });

  return map;
}

function loadSourceFiles(
  locationKeyToHookSourceData: Map<string, HookSourceData>,
): Promise<*> {
  // Deduplicate fetches, since there can be multiple location keys per file.
  const fetchPromises = new Map();

  const setPromises = [];
  locationKeyToHookSourceData.forEach(hookSourceData => {
    const {runtimeSourceURL} = hookSourceData;
    const fetchPromise =
      fetchPromises.get(runtimeSourceURL) ||
      fetchFile(runtimeSourceURL).then(runtimeSourceCode => {
        if (runtimeSourceCode.length > MAX_SOURCE_LENGTH) {
          throw Error('Source code too large to parse');
        }
        if (__DEBUG__) {
          console.groupCollapsed(
            `loadSourceFiles() runtimeSourceURL "${runtimeSourceURL}"`,
          );
          console.log(runtimeSourceCode);
          console.groupEnd();
        }
        return runtimeSourceCode;
      });
    fetchPromises.set(runtimeSourceURL, fetchPromise);
    setPromises.push(
      fetchPromise.then(runtimeSourceCode => {
        hookSourceData.runtimeSourceCode = runtimeSourceCode;
      }),
    );
  });
  return Promise.all(setPromises);
}

async function parseSourceAST(
  locationKeyToHookSourceData: Map<string, HookSourceData>,
): Promise<*> {
  locationKeyToHookSourceData.forEach(hookSourceData => {
    if (hookSourceData.originalSourceAST !== null) {
      // Use cached metadata.
      return;
    }

    const {sourceConsumer} = hookSourceData;
    const runtimeSourceCode = ((hookSourceData.runtimeSourceCode: any): string);
    let originalSourceURL, originalSourceCode;
    if (sourceConsumer !== null) {
      // Parse and extract the AST from the source map.
      const {lineNumber, columnNumber} = hookSourceData.hookSource;
      if (lineNumber == null || columnNumber == null) {
        throw Error('Hook source code location not found.');
      }
      // Now that the source map has been loaded,
      // extract the original source for later.
      const {source} = sourceConsumer.originalPositionFor({
        line: lineNumber,

        // Column numbers are representated differently between tools/engines.
        // For more info see https://github.com/facebook/react/issues/21792#issuecomment-873171991
        column: columnNumber - 1,
      });

      if (source == null) {
        // TODO (named hooks) maybe fall back to the runtime source instead of throwing?
        throw new Error(
          'Could not map hook runtime location to original source location',
        );
      }

      // TODO (named hooks) maybe canonicalize this URL somehow?
      // It can be relative if the source map specifies it that way,
      // but we use it as a cache key across different source maps and there can be collisions.
      originalSourceURL = (source: string);
      originalSourceCode = (sourceConsumer.sourceContentFor(
        source,
        true,
      ): string);

      if (__DEBUG__) {
        console.groupCollapsed(
          'parseSourceAST() Extracted source code from source map',
        );
        console.log(originalSourceCode);
        console.groupEnd();
      }
    } else {
      // There's no source map to parse here so we can just parse the original source itself.
      originalSourceCode = runtimeSourceCode;
      // TODO (named hooks) This mixes runtimeSourceURLs with source mapped URLs in the same cache key space.
      // Namespace them?
      originalSourceURL = hookSourceData.runtimeSourceURL;
    }

    hookSourceData.originalSourceCode = originalSourceCode;
    hookSourceData.originalSourceURL = originalSourceURL;

    // The cache also serves to deduplicate parsing by URL in our loop over
    // location keys. This may need to change if we switch to async parsing.
    const sourceMetadata = originalURLToMetadataCache.get(originalSourceURL);
    if (sourceMetadata != null) {
      if (__DEBUG__) {
        console.groupCollapsed(
          `parseSourceAST() Found cached source metadata for "${originalSourceURL}"`,
        );
        console.log(sourceMetadata);
        console.groupEnd();
      }
      hookSourceData.originalSourceAST = sourceMetadata.originalSourceAST;
      hookSourceData.originalSourceCode = sourceMetadata.originalSourceCode;
    } else {
      // TODO (named hooks) Parsing should ideally be done off of the main thread.
      const originalSourceAST = parse(originalSourceCode, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
      });
      hookSourceData.originalSourceAST = originalSourceAST;
      if (__DEBUG__) {
        console.log(
          `parseSourceAST() Caching source metadata for "${originalSourceURL}"`,
        );
      }
      originalURLToMetadataCache.set(originalSourceURL, {
        originalSourceAST,
        originalSourceCode,
      });
    }
  });
  return Promise.resolve();
}

function flattenHooksList(
  hooksTree: HooksTree,
  hooksList: Array<HooksNode>,
): void {
  for (let i = 0; i < hooksTree.length; i++) {
    const hook = hooksTree[i];
    hooksList.push(hook);
    if (hook.subHooks.length > 0) {
      flattenHooksList(hook.subHooks, hooksList);
    }
  }
}

function updateLruCache(
  locationKeyToHookSourceData: Map<string, HookSourceData>,
): Promise<*> {
  locationKeyToHookSourceData.forEach(({sourceConsumer, runtimeSourceURL}) => {
    // Only set once to avoid triggering eviction/cleanup code.
    if (!runtimeURLToMetadataCache.has(runtimeSourceURL)) {
      if (__DEBUG__) {
        console.log(
          `updateLruCache() Caching runtime metadata for "${runtimeSourceURL}"`,
        );
      }

      runtimeURLToMetadataCache.set(runtimeSourceURL, {
        sourceConsumer,
      });
    }
  });
  return Promise.resolve();
}
