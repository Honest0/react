// @flow

import React, { Fragment, useContext } from 'react';
import ProfilerStore from 'src/devtools/ProfilerStore';
import { ProfilerContext } from './ProfilerContext';
import { formatDuration, formatTime } from './utils';
import { StoreContext } from '../context';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';

import styles from './SidebarSelectedFiberInfo.css';

export type Props = {||};

export default function SidebarSelectedFiberInfo(_: Props) {
  const { profilerStore } = useContext(StoreContext);
  const {
    rootID,
    selectCommitIndex,
    selectedCommitIndex,
    selectedFiberID,
    selectedFiberName,
    selectFiber,
  } = useContext(ProfilerContext);
  const { profilingCache } = profilerStore;

  const commitIndices = profilingCache.getFiberCommits({
    fiberID: ((selectedFiberID: any): number),
    rootID: ((rootID: any): number),
  });

  const listItems = [];
  for (let i = 0; i < commitIndices.length; i++) {
    const commitIndex = commitIndices[i];

    const { duration, timestamp } = profilerStore.getCommitData(
      ((rootID: any): number),
      commitIndex
    );

    listItems.push(
      <button
        key={commitIndex}
        className={
          selectedCommitIndex === commitIndex
            ? styles.CurrentCommit
            : styles.Commit
        }
        onClick={() => selectCommitIndex(commitIndex)}
      >
        {formatTime(timestamp)}s for {formatDuration(duration)}ms
      </button>
    );
  }

  return (
    <Fragment>
      <div className={styles.Toolbar}>
        <div className={styles.Component}>
          {selectedFiberName || 'Selected component'}
        </div>

        <Button
          className={styles.IconButton}
          onClick={() => selectFiber(null, null)}
          title="Back to commit view"
        >
          <ButtonIcon type="close" />
        </Button>
      </div>
      <div className={styles.Content}>
        <WhatChanged
          commitIndex={((selectedCommitIndex: any): number)}
          fiberID={((selectedFiberID: any): number)}
          profilerStore={profilerStore}
          rootID={((rootID: any): number)}
        />
        {listItems.length > 0 && (
          <Fragment>
            <label className={styles.Label}>Rendered at</label>: {listItems}
          </Fragment>
        )}
        {listItems.length === 0 && (
          <div>Did not render during this profiling session.</div>
        )}
      </div>
    </Fragment>
  );
}

type WhatChangedProps = {|
  commitIndex: number,
  fiberID: number,
  profilerStore: ProfilerStore,
  rootID: number,
|};

function WhatChanged({
  commitIndex,
  fiberID,
  profilerStore,
  rootID,
}: WhatChangedProps) {
  const { changeDescriptions } = profilerStore.getCommitData(
    ((rootID: any): number),
    commitIndex
  );
  if (changeDescriptions === null) {
    return null;
  }

  const changeDescription = changeDescriptions.get(fiberID);
  if (changeDescription == null) {
    return null;
  }

  if (changeDescription.isFirstMount) {
    return (
      <div className={styles.WhatChanged}>
        <label className={styles.Label}>Why did this render?</label>
        <div className={styles.WhatChangedItem}>
          This is the first time the component rendered.
        </div>
      </div>
    );
  }

  const changes = [];

  if (changeDescription.context === true) {
    changes.push(
      <div key="context" className={styles.WhatChangedItem}>
        • Context changed
      </div>
    );
  } else if (
    typeof changeDescription.context === 'object' &&
    changeDescription.context !== null &&
    changeDescription.context.length !== 0
  ) {
    changes.push(
      <div key="context" className={styles.WhatChangedItem}>
        • Context changed:
        {changeDescription.context.map(key => (
          <span key={key} className={styles.WhatChangedKey}>
            {key}
          </span>
        ))}
      </div>
    );
  }

  if (changeDescription.didHooksChange) {
    changes.push(
      <div key="hooks" className={styles.WhatChangedItem}>
        • Hooks changed
      </div>
    );
  }

  if (
    changeDescription.props !== null &&
    changeDescription.props.length !== 0
  ) {
    changes.push(
      <div key="props" className={styles.WhatChangedItem}>
        • Props changed:
        {changeDescription.props.map(key => (
          <span key={key} className={styles.WhatChangedKey}>
            {key}
          </span>
        ))}
      </div>
    );
  }

  if (
    changeDescription.state !== null &&
    changeDescription.state.length !== 0
  ) {
    changes.push(
      <div key="state" className={styles.WhatChangedItem}>
        • State changed:
        {changeDescription.state.map(key => (
          <span key={key} className={styles.WhatChangedKey}>
            {key}
          </span>
        ))}
      </div>
    );
  }

  if (changes.length === 0) {
    changes.push(
      <div key="nothing" className={styles.WhatChangedItem}>
        The parent component rendered.
      </div>
    );
  }

  return (
    <div className={styles.WhatChanged}>
      <label className={styles.Label}>Why did this render?</label>
      {changes}
    </div>
  );
}
