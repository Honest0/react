/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentMeasure, ReactProfilerData} from '../types';
import type {
  Interaction,
  IntrinsicSize,
  MouseMoveInteraction,
  Rect,
  ViewRefs,
} from '../view-base';

import {
  durationToWidth,
  positioningScaleFactor,
  positionToTimestamp,
  timestampToPosition,
} from './utils/positioning';
import {drawText} from './utils/text';
import {formatDuration} from '../utils/formatting';
import {
  View,
  Surface,
  rectContainsPoint,
  rectIntersectsRect,
  intersectionOfRects,
} from '../view-base';
import {COLORS, NATIVE_EVENT_HEIGHT, BORDER_SIZE} from './constants';

const ROW_WITH_BORDER_HEIGHT = NATIVE_EVENT_HEIGHT + BORDER_SIZE;

export class ComponentMeasuresView extends View {
  _hoveredComponentMeasure: ReactComponentMeasure | null = null;
  _intrinsicSize: IntrinsicSize;
  _profilerData: ReactProfilerData;

  onHover: ((event: ReactComponentMeasure | null) => void) | null = null;

  constructor(surface: Surface, frame: Rect, profilerData: ReactProfilerData) {
    super(surface, frame);

    this._profilerData = profilerData;

    this._intrinsicSize = {
      width: profilerData.duration,
      height: ROW_WITH_BORDER_HEIGHT,
    };
  }

  desiredSize() {
    return this._intrinsicSize;
  }

  setHoveredEvent(hoveredEvent: ReactComponentMeasure | null) {
    if (this._hoveredComponentMeasure === hoveredEvent) {
      return;
    }
    this._hoveredComponentMeasure = hoveredEvent;
    this.setNeedsDisplay();
  }

  /**
   * Draw a single `ReactComponentMeasure` as a box/span with text inside of it.
   */
  _drawSingleReactComponentMeasure(
    context: CanvasRenderingContext2D,
    rect: Rect,
    componentMeasure: ReactComponentMeasure,
    scaleFactor: number,
    showHoverHighlight: boolean,
  ): boolean {
    const {frame} = this;
    const {componentName, duration, timestamp, warning} = componentMeasure;

    const xStart = timestampToPosition(timestamp, scaleFactor, frame);
    const xStop = timestampToPosition(timestamp + duration, scaleFactor, frame);
    const componentMeasureRect: Rect = {
      origin: {
        x: xStart,
        y: frame.origin.y,
      },
      size: {width: xStop - xStart, height: NATIVE_EVENT_HEIGHT},
    };
    if (!rectIntersectsRect(componentMeasureRect, rect)) {
      return false; // Not in view
    }

    const width = durationToWidth(duration, scaleFactor);
    if (width < 1) {
      return false; // Too small to render at this zoom level
    }

    const drawableRect = intersectionOfRects(componentMeasureRect, rect);
    context.beginPath();
    if (warning !== null) {
      context.fillStyle = showHoverHighlight
        ? COLORS.WARNING_BACKGROUND_HOVER
        : COLORS.WARNING_BACKGROUND;
    } else {
      context.fillStyle = showHoverHighlight
        ? COLORS.REACT_COMPONENT_MEASURE_HOVER
        : COLORS.REACT_COMPONENT_MEASURE;
    }
    context.fillRect(
      drawableRect.origin.x,
      drawableRect.origin.y,
      drawableRect.size.width,
      drawableRect.size.height,
    );

    const label = `${componentName} rendered - ${formatDuration(duration)}`;

    drawText(label, context, componentMeasureRect, drawableRect);

    return true;
  }

  draw(context: CanvasRenderingContext2D) {
    const {
      frame,
      _profilerData: {componentMeasures},
      _hoveredComponentMeasure,
      visibleArea,
    } = this;

    context.fillStyle = COLORS.BACKGROUND;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y,
      visibleArea.size.width,
      visibleArea.size.height,
    );

    // Draw events
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );

    let didDrawMeasure = false;
    componentMeasures.forEach(componentMeasure => {
      didDrawMeasure =
        this._drawSingleReactComponentMeasure(
          context,
          visibleArea,
          componentMeasure,
          scaleFactor,
          componentMeasure === _hoveredComponentMeasure,
        ) || didDrawMeasure;
    });

    if (!didDrawMeasure) {
      drawText(
        '(zoom or pan to see React components)',
        context,
        visibleArea,
        visibleArea,
        {fillStyle: COLORS.TEXT_DIM_COLOR, textAlign: 'center'},
      );
    }

    context.fillStyle = COLORS.PRIORITY_BORDER;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y + ROW_WITH_BORDER_HEIGHT - BORDER_SIZE,
      visibleArea.size.width,
      BORDER_SIZE,
    );
  }

  /**
   * @private
   */
  _handleMouseMove(interaction: MouseMoveInteraction, viewRefs: ViewRefs) {
    const {frame, _intrinsicSize, onHover, visibleArea} = this;
    if (!onHover) {
      return;
    }

    const {location} = interaction.payload;
    if (!rectContainsPoint(location, visibleArea)) {
      onHover(null);
      return;
    }

    const scaleFactor = positioningScaleFactor(_intrinsicSize.width, frame);
    const hoverTimestamp = positionToTimestamp(location.x, scaleFactor, frame);

    const componentMeasures = this._profilerData.componentMeasures;
    for (let index = componentMeasures.length - 1; index >= 0; index--) {
      const componentMeasure = componentMeasures[index];
      const {duration, timestamp} = componentMeasure;

      if (
        hoverTimestamp >= timestamp &&
        hoverTimestamp <= timestamp + duration
      ) {
        this.currentCursor = 'context-menu';
        viewRefs.hoveredView = this;
        onHover(componentMeasure);
        return;
      }
    }

    onHover(null);
  }

  handleInteraction(interaction: Interaction, viewRefs: ViewRefs) {
    switch (interaction.type) {
      case 'mousemove':
        this._handleMouseMove(interaction, viewRefs);
        break;
    }
  }
}
