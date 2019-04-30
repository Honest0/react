// @flow

import type {
  InteractionWithCommitsFrontend,
  ProfilingSummaryFrontend,
} from './types';

export type ChartData = {|
  lastInteractionTime: number,
  maxCommitDuration: number,
|};

const cachedChartData: Map<number, ChartData> = new Map();

export function getChartData({
  interactions,
  profilingSummary,
}: {|
  interactions: Array<InteractionWithCommitsFrontend>,
  profilingSummary: ProfilingSummaryFrontend,
|}): ChartData {
  const { rootID } = profilingSummary;

  if (cachedChartData.has(rootID)) {
    return ((cachedChartData.get(rootID): any): ChartData);
  }

  const { commitDurations, commitTimes } = profilingSummary;

  const lastInteractionTime =
    commitTimes.length > 0 ? commitTimes[commitTimes.length - 1] : 0;

  let maxCommitDuration = 0;

  commitDurations.forEach(commitDuration => {
    maxCommitDuration = Math.max(maxCommitDuration, commitDuration);
  });

  const chartData = { lastInteractionTime, maxCommitDuration };

  cachedChartData.set(rootID, chartData);

  return chartData;
}

export function invalidateChartData(): void {
  cachedChartData.clear();
}
