// @flow

import React, { Fragment, useContext } from 'react';
import { ModalDialog } from '../ModalDialog';
import { ProfilerContext } from './ProfilerContext';
import TabBar from '../TabBar';
import ClearProfilingDataButton from './ClearProfilingDataButton';
import CommitFlamegraph from './CommitFlamegraph';
import CommitRanked from './CommitRanked';
import Interactions from './Interactions';
import RootSelector from './RootSelector';
import RecordToggle from './RecordToggle';
import ReloadAndProfileButton from './ReloadAndProfileButton';
import ProfilingImportExportButtons from './ProfilingImportExportButtons';
import SnapshotSelector from './SnapshotSelector';
import SidebarCommitInfo from './SidebarCommitInfo';
import SidebarInteractions from './SidebarInteractions';
import SidebarSelectedFiberInfo from './SidebarSelectedFiberInfo';
import SettingsModal from 'src/devtools/views/Settings/SettingsModal';
import SettingsModalContextToggle from 'src/devtools/views/Settings/SettingsModalContextToggle';
import { SettingsModalContextController } from 'src/devtools/views/Settings/SettingsModalContext';
import portaledContent from '../portaledContent';

import styles from './Profiler.css';

function Profiler(_: {||}) {
  const {
    didRecordCommits,
    isProcessingData,
    isProfiling,
    selectedCommitIndex,
    selectedFiberID,
    selectedTabID,
    selectTab,
    supportsProfiling,
  } = useContext(ProfilerContext);

  let view = null;
  if (didRecordCommits) {
    switch (selectedTabID) {
      case 'flame-chart':
        view = <CommitFlamegraph />;
        break;
      case 'ranked-chart':
        view = <CommitRanked />;
        break;
      case 'interactions':
        view = <Interactions />;
        break;
      default:
        break;
    }
  } else if (isProfiling) {
    view = <RecordingInProgress />;
  } else if (isProcessingData) {
    view = <ProcessingData />;
  } else if (supportsProfiling) {
    view = <NoProfilingData />;
  } else {
    view = <ProfilingNotSupported />;
  }

  let sidebar = null;
  if (!isProfiling && !isProcessingData && didRecordCommits) {
    switch (selectedTabID) {
      case 'interactions':
        sidebar = <SidebarInteractions />;
        break;
      case 'flame-chart':
      case 'ranked-chart':
        // TRICKY
        // Handle edge case where no commit is selected because of a min-duration filter update.
        // In that case, the selected commit index would be null.
        // We could still show a sidebar for the previously selected fiber,
        // but it would be an odd user experience.
        // TODO (ProfilerContext) This check should not be necessary.
        if (selectedCommitIndex !== null) {
          if (selectedFiberID !== null) {
            sidebar = <SidebarSelectedFiberInfo />;
          } else {
            sidebar = <SidebarCommitInfo />;
          }
        }
        break;
      default:
        break;
    }
  }

  return (
    <SettingsModalContextController>
      <div className={styles.Profiler}>
        <div className={styles.LeftColumn}>
          <div className={styles.Toolbar}>
            <RecordToggle disabled={!supportsProfiling} />
            <ReloadAndProfileButton />
            <ClearProfilingDataButton />
            <ProfilingImportExportButtons />
            <div className={styles.VRule} />
            <TabBar
              currentTab={selectedTabID}
              id="Profiler"
              selectTab={selectTab}
              tabs={tabs}
              type="profiler"
            />
            <RootSelector />
            <div className={styles.Spacer} />
            <SettingsModalContextToggle />
            {didRecordCommits && (
              <Fragment>
                <div className={styles.VRule} />
                <SnapshotSelector />
              </Fragment>
            )}
          </div>
          <div className={styles.Content}>
            {view}
            <ModalDialog />
          </div>
        </div>
        <div className={styles.RightColumn}>{sidebar}</div>
        <SettingsModal />
      </div>
    </SettingsModalContextController>
  );
}

const tabs = [
  {
    id: 'flame-chart',
    icon: 'flame-chart',
    label: 'Flamegraph',
    title: 'Flamegraph chart',
  },
  {
    id: 'ranked-chart',
    icon: 'ranked-chart',
    label: 'Ranked',
    title: 'Ranked chart',
  },
  {
    id: 'interactions',
    icon: 'interactions',
    label: 'Interactions',
    title: 'Profiled interactions',
  },
];

const NoProfilingData = () => (
  <div className={styles.Column}>
    <div className={styles.Header}>No profiling data has been recorded.</div>
    <div className={styles.Row}>
      Click the record button <RecordToggle /> to start recording.
    </div>
  </div>
);

const ProfilingNotSupported = () => (
  <div className={styles.Column}>
    <div className={styles.Header}>Profiling not supported.</div>
    <p className={styles.Paragraph}>
      Profiling support requires either a development or production-profiling
      build of React v16.5+.
    </p>
    <p className={styles.Paragraph}>
      Learn more at{' '}
      <a
        className={styles.Link}
        href="https://fb.me/react-profiling"
        rel="noopener noreferrer"
        target="_blank"
      >
        fb.me/react-profiling
      </a>
      .
    </p>
  </div>
);

const ProcessingData = () => (
  <div className={styles.Column}>
    <div className={styles.Header}>Processing data...</div>
    <div className={styles.Row}>This should only take a minute.</div>
  </div>
);

const RecordingInProgress = () => (
  <div className={styles.Column}>
    <div className={styles.Header}>Profiling is in progress...</div>
    <div className={styles.Row}>
      Click the record button <RecordToggle /> to stop recording.
    </div>
  </div>
);

export default portaledContent(Profiler);
