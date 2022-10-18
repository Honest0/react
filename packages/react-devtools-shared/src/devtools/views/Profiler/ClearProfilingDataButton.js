/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';
import {ProfilerContext} from './ProfilerContext';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {StoreContext} from '../context';
import {TimelineContext} from 'react-devtools-timeline/src/TimelineContext';

export default function ClearProfilingDataButton(): React.Node {
  const store = useContext(StoreContext);
  const {didRecordCommits, isProfiling} = useContext(ProfilerContext);
  const {file, setFile} = useContext(TimelineContext);
  const {profilerStore} = store;

  const doesHaveInMemoryData = didRecordCommits;
  const doesHaveUserTimingData = file !== null;

  const clear = () => {
    if (doesHaveInMemoryData) {
      profilerStore.clear();
    }
    if (doesHaveUserTimingData) {
      setFile(null);
    }
  };

  return (
    <Button
      disabled={
        isProfiling || !(doesHaveInMemoryData || doesHaveUserTimingData)
      }
      onClick={clear}
      title="Clear profiling data">
      <ButtonIcon type="clear" />
    </Button>
  );
}
