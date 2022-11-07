/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {copy} from 'clipboard-js';
import * as React from 'react';
import {ElementTypeHostComponent} from 'react-devtools-shared/src/types';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import KeyValue from './KeyValue';
import {alphaSortEntries, serializeDataForCopy} from '../utils';
import Store from '../../store';
import styles from './InspectedElementSharedStyles.css';

import type {InspectedElement} from './types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {Element} from 'react-devtools-shared/src/devtools/views/Components/types';

type Props = {
  bridge: FrontendBridge,
  element: Element,
  inspectedElement: InspectedElement,
  store: Store,
};

export default function InspectedElementStateTree({
  bridge,
  element,
  inspectedElement,
  store,
}: Props): React.Node {
  const {state, type} = inspectedElement;

  // HostSingleton and HostResource may have state that we don't want to expose to users
  const isHostComponent = type === ElementTypeHostComponent;

  const entries = state != null ? Object.entries(state) : null;
  const isEmpty = entries === null || entries.length === 0;

  if (isEmpty || isHostComponent) {
    return null;
  }

  if (entries !== null) {
    entries.sort(alphaSortEntries);
  }

  const handleCopy = () => copy(serializeDataForCopy(((state: any): Object)));

  return (
    <div className={styles.InspectedElementTree}>
      <div className={styles.HeaderRow}>
        <div className={styles.Header}>state</div>
        {!isEmpty && (
          <Button onClick={handleCopy} title="Copy to clipboard">
            <ButtonIcon type="copy" />
          </Button>
        )}
      </div>
      {isEmpty && <div className={styles.Empty}>None</div>}
      {!isEmpty &&
        (entries: any).map(([name, value]) => (
          <KeyValue
            key={name}
            alphaSort={true}
            bridge={bridge}
            canDeletePaths={true}
            canEditValues={true}
            canRenamePaths={true}
            depth={1}
            element={element}
            hidden={false}
            inspectedElement={inspectedElement}
            name={name}
            path={[name]}
            pathRoot="state"
            store={store}
            value={value}
          />
        ))}
    </div>
  );
}
