// @flow

import React, { useCallback, useContext, useMemo } from 'react';
import { ElementTypeHostComponent } from 'src/types';
import { useSubscription } from '../hooks';
import { StoreContext } from '../context';
import { SettingsContext } from './SettingsContext';
import Store from 'src/devtools/store';
import portaledContent from '../portaledContent';

import styles from './Settings.css';

import type { FilterPreferences } from 'src/types';

function Settings(_: {||}) {
  const store = useContext(StoreContext);
  const { displayDensity, setDisplayDensity, theme, setTheme } = useContext(
    SettingsContext
  );

  const captureScreenshotsSubscription = useMemo(
    () => ({
      getCurrentValue: () => store.captureScreenshots,
      subscribe: (callback: Function) => {
        store.addListener('captureScreenshots', callback);
        return () => store.removeListener('captureScreenshots', callback);
      },
    }),
    [store]
  );
  const captureScreenshots = useSubscription<boolean, Store>(
    captureScreenshotsSubscription
  );

  const collapseNodesByDefaultSubscription = useMemo(
    () => ({
      getCurrentValue: () => store.collapseNodesByDefault,
      subscribe: (callback: Function) => {
        store.addListener('collapseNodesByDefault', callback);
        return () => store.removeListener('collapseNodesByDefault', callback);
      },
    }),
    [store]
  );
  const collapseNodesByDefault = useSubscription<boolean, Store>(
    collapseNodesByDefaultSubscription
  );

  const filterPreferencesSubscription = useMemo(
    () => ({
      getCurrentValue: () => store.filterPreferences,
      subscribe: (callback: Function) => {
        store.addListener('filterPreferences', callback);
        return () => store.removeListener('filterPreferences', callback);
      },
    }),
    [store]
  );
  const filterPreferences = useSubscription<FilterPreferences, Store>(
    filterPreferencesSubscription
  );

  const updateFilterPreferences = useCallback(
    ({ currentTarget }) => {
      const filterPreferences = store.filterPreferences;
      if (currentTarget.checked) {
        filterPreferences.hideElementsWithTypes.add(ElementTypeHostComponent);
      } else {
        filterPreferences.hideElementsWithTypes.delete(
          ElementTypeHostComponent
        );
      }
      store.filterPreferences = { ...filterPreferences };
    },
    [store]
  );

  const updateDisplayDensity = useCallback(
    ({ currentTarget }) => {
      setDisplayDensity(currentTarget.value);
    },
    [setDisplayDensity]
  );

  const updateTheme = useCallback(
    ({ currentTarget }) => {
      setTheme(currentTarget.value);
    },
    [setTheme]
  );

  const updateCaptureScreenshotsWhileProfiling = useCallback(
    ({ currentTarget }) => {
      store.captureScreenshots = currentTarget.checked;
    },
    [store]
  );
  const updateCollapseNodesByDefault = useCallback(
    ({ currentTarget }) => {
      store.collapseNodesByDefault = currentTarget.checked;
    },
    [store]
  );

  return (
    <div className={styles.Settings}>
      <div className={styles.Section}>
        <div className={styles.Header}>Display preferences</div>
        <div className={styles.OptionGroup}>
          <div className={styles.OptionLabel}>Theme</div>
          <label className={styles.RadioOption}>
            <input
              type="radio"
              name="Settings-theme"
              checked={theme === 'auto'}
              value="auto"
              onChange={updateTheme}
            />{' '}
            Auto
          </label>
          <label className={styles.RadioOption}>
            <input
              type="radio"
              name="Settings-theme"
              checked={theme === 'light'}
              value="light"
              onChange={updateTheme}
            />{' '}
            Light
          </label>
          <label className={styles.RadioOption}>
            <input
              type="radio"
              name="Settings-theme"
              checked={theme === 'dark'}
              value="dark"
              onChange={updateTheme}
            />{' '}
            Dark
          </label>
        </div>
        <div className={styles.OptionGroup}>
          <div className={styles.OptionLabel}>Display density</div>
          <label className={styles.RadioOption}>
            <input
              type="radio"
              name="Settings-displayDensity"
              checked={displayDensity === 'compact'}
              value="compact"
              onChange={updateDisplayDensity}
            />{' '}
            Compact
          </label>
          <label className={styles.RadioOption}>
            <input
              type="radio"
              name="Settings-displayDensity"
              checked={displayDensity === 'comfortable'}
              value="comfortable"
              onChange={updateDisplayDensity}
            />{' '}
            Comfortable
          </label>
        </div>
      </div>

      <div className={styles.Section}>
        <div className={styles.Header}>Components tree</div>

        <label className={styles.CheckboxOption}>
          <input
            type="checkbox"
            checked={collapseNodesByDefault}
            onChange={updateCollapseNodesByDefault}
          />{' '}
          Collapse newly added components by default
        </label>

        <label className={styles.CheckboxOption}>
          <input
            type="checkbox"
            checked={filterPreferences.hideElementsWithTypes.has(
              ElementTypeHostComponent
            )}
            onChange={updateFilterPreferences}
          />{' '}
          Hide host components (e.g. <code>&lt;div&gt;</code>)
        </label>
      </div>

      {store.supportsCaptureScreenshots && (
        <div className={styles.Section}>
          <div className={styles.Header}>Profiler</div>
          <label className={styles.CheckboxOption}>
            <input
              type="checkbox"
              checked={captureScreenshots}
              onChange={updateCaptureScreenshotsWhileProfiling}
            />{' '}
            Capture screenshots while profiling
          </label>
          {captureScreenshots && (
            <div className={styles.ScreenshotThrottling}>
              Screenshots will be throttled in order to reduce the negative
              impact on performance.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default portaledContent(Settings);
