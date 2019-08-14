// @flow

import {copy} from 'clipboard-js';
import React, {useCallback} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import KeyValue from './KeyValue';
import {serializeDataForCopy} from '../utils';
import styles from './InspectedElementTree.css';

import type {InspectPath} from './SelectedElement';

type OverrideValueFn = (path: Array<string | number>, value: any) => void;

type Props = {|
  data: Object | null,
  inspectPath?: InspectPath,
  label: string,
  overrideValueFn?: ?OverrideValueFn,
  showWhenEmpty?: boolean,
|};

export default function InspectedElementTree({
  data,
  inspectPath,
  label,
  overrideValueFn,
  showWhenEmpty = false,
}: Props) {
  const isEmpty = data === null || Object.keys(data).length === 0;

  const handleCopy = useCallback(
    () => copy(serializeDataForCopy(((data: any): Object))),
    [data],
  );

  if (isEmpty && !showWhenEmpty) {
    return null;
  } else {
    return (
      <div className={styles.InspectedElementTree}>
        <div className={styles.HeaderRow}>
          <div className={styles.Header}>{label}</div>
          {!isEmpty && (
            <Button onClick={handleCopy} title="Copy to clipboard">
              <ButtonIcon type="copy" />
            </Button>
          )}
        </div>
        {isEmpty && <div className={styles.Empty}>None</div>}
        {!isEmpty &&
          Object.keys((data: any)).map(name => (
            <KeyValue
              key={name}
              depth={1}
              inspectPath={inspectPath}
              name={name}
              overrideValueFn={overrideValueFn}
              path={[name]}
              value={(data: any)[name]}
            />
          ))}
      </div>
    );
  }
}
