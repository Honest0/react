/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {CommitTree} from './types';
import type {SerializedElement} from '../Components/types';

import * as React from 'react';
import {useContext} from 'react';
import {ProfilerContext} from './ProfilerContext';
import styles from './Updaters.css';

export type Props = {|
  commitTree: CommitTree,
  updaters: Array<SerializedElement>,
|};

export default function Updaters({commitTree, updaters}: Props) {
  const {selectFiber} = useContext(ProfilerContext);

  const children =
    updaters.length > 0 ? (
      updaters.map<React$Node>((serializedElement: SerializedElement) => {
        const {displayName, id, key} = serializedElement;
        const isVisibleInTree = commitTree.nodes.has(id);
        if (isVisibleInTree) {
          return (
            <button
              key={id}
              className={styles.Updater}
              onClick={() => selectFiber(id, displayName)}>
              {displayName} {key ? `key="${key}"` : ''}
            </button>
          );
        } else {
          return (
            <div key={id} className={styles.UnmountedUpdater}>
              {displayName} {key ? `key="${key}"` : ''}
            </div>
          );
        }
      })
    ) : (
      <div key="none" className={styles.NoUpdaters}>
        (unknown)
      </div>
    );

  return <div className={styles.Updaters}>{children}</div>;
}
