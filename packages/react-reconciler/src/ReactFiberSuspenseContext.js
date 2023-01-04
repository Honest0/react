/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {StackCursor} from './ReactFiberStack';
import type {SuspenseProps, SuspenseState} from './ReactFiberSuspenseComponent';
import type {OffscreenState} from './ReactFiberOffscreenComponent';

import {enableSuspenseAvoidThisFallback} from 'shared/ReactFeatureFlags';
import {createCursor, push, pop} from './ReactFiberStack';
import {isCurrentTreeHidden} from './ReactFiberHiddenContext';
import {OffscreenComponent} from './ReactWorkTags';

// The Suspense handler is the boundary that should capture if something
// suspends, i.e. it's the nearest `catch` block on the stack.
const suspenseHandlerStackCursor: StackCursor<Fiber | null> = createCursor(
  null,
);

// Represents the outermost boundary that is not visible in the current tree.
// Everything above this is the "shell". When this is null, it means we're
// rendering in the shell of the app. If it's non-null, it means we're rendering
// deeper than the shell, inside a new tree that wasn't already visible.
//
// The main way we use this concept is to determine whether showing a fallback
// would result in a desirable or undesirable loading state. Activing a fallback
// in the shell is considered an undersirable loading state, because it would
// mean hiding visible (albeit stale) content in the current tree — we prefer to
// show the stale content, rather than switch to a fallback. But showing a
// fallback in a new tree is fine, because there's no stale content to
// prefer instead.
let shellBoundary: Fiber | null = null;

export function getShellBoundary(): Fiber | null {
  return shellBoundary;
}

export function pushPrimaryTreeSuspenseHandler(handler: Fiber): void {
  // TODO: Pass as argument
  const current = handler.alternate;
  const props: SuspenseProps = handler.pendingProps;

  // Experimental feature: Some Suspense boundaries are marked as having an
  // undesirable fallback state. These have special behavior where we only
  // activate the fallback if there's no other boundary on the stack that we can
  // use instead.
  if (
    enableSuspenseAvoidThisFallback &&
    props.unstable_avoidThisFallback === true &&
    // If an avoided boundary is already visible, it behaves identically to
    // a regular Suspense boundary.
    (current === null || isCurrentTreeHidden())
  ) {
    if (shellBoundary === null) {
      // We're rendering in the shell. There's no parent Suspense boundary that
      // can provide a desirable fallback state. We'll use this boundary.
      push(suspenseHandlerStackCursor, handler, handler);

      // However, because this is not a desirable fallback, the children are
      // still considered part of the shell. So we intentionally don't assign
      // to `shellBoundary`.
    } else {
      // There's already a parent Suspense boundary that can provide a desirable
      // fallback state. Prefer that one.
      const handlerOnStack = suspenseHandlerStackCursor.current;
      push(suspenseHandlerStackCursor, handlerOnStack, handler);
    }
    return;
  }

  // TODO: If the parent Suspense handler already suspended, there's no reason
  // to push a nested Suspense handler, because it will get replaced by the
  // outer fallback, anyway. Consider this as a future optimization.
  push(suspenseHandlerStackCursor, handler, handler);
  if (shellBoundary === null) {
    if (current === null || isCurrentTreeHidden()) {
      // This boundary is not visible in the current UI.
      shellBoundary = handler;
    } else {
      const prevState: SuspenseState = current.memoizedState;
      if (prevState !== null) {
        // This boundary is showing a fallback in the current UI.
        shellBoundary = handler;
      }
    }
  }
}

export function pushFallbackTreeSuspenseHandler(fiber: Fiber): void {
  // We're about to render the fallback. If something in the fallback suspends,
  // it's akin to throwing inside of a `catch` block. This boundary should not
  // capture. Reuse the existing handler on the stack.
  reuseSuspenseHandlerOnStack(fiber);
}

export function pushOffscreenSuspenseHandler(fiber: Fiber): void {
  if (fiber.tag === OffscreenComponent) {
    push(suspenseHandlerStackCursor, fiber, fiber);
    if (shellBoundary !== null) {
      // A parent boundary is showing a fallback, so we've already rendered
      // deeper than the shell.
    } else {
      const current = fiber.alternate;
      if (current !== null) {
        const prevState: OffscreenState = current.memoizedState;
        if (prevState !== null) {
          // This is the first boundary in the stack that's already showing
          // a fallback. So everything outside is considered the shell.
          shellBoundary = fiber;
        }
      }
    }
  } else {
    // This is a LegacyHidden component.
    reuseSuspenseHandlerOnStack(fiber);
  }
}

export function reuseSuspenseHandlerOnStack(fiber: Fiber) {
  push(suspenseHandlerStackCursor, getSuspenseHandler(), fiber);
}

export function getSuspenseHandler(): Fiber | null {
  return suspenseHandlerStackCursor.current;
}

export function popSuspenseHandler(fiber: Fiber): void {
  pop(suspenseHandlerStackCursor, fiber);
  if (shellBoundary === fiber) {
    // Popping back into the shell.
    shellBoundary = null;
  }
}

// SuspenseList context
// TODO: Move to a separate module? We may change the SuspenseList
// implementation to hide/show in the commit phase, anyway.
export opaque type SuspenseContext = number;
export opaque type SubtreeSuspenseContext: SuspenseContext = number;
export opaque type ShallowSuspenseContext: SuspenseContext = number;

const DefaultSuspenseContext: SuspenseContext = 0b00;

const SubtreeSuspenseContextMask: SuspenseContext = 0b01;

// ForceSuspenseFallback can be used by SuspenseList to force newly added
// items into their fallback state during one of the render passes.
export const ForceSuspenseFallback: ShallowSuspenseContext = 0b10;

export const suspenseStackCursor: StackCursor<SuspenseContext> = createCursor(
  DefaultSuspenseContext,
);

export function hasSuspenseListContext(
  parentContext: SuspenseContext,
  flag: SuspenseContext,
): boolean {
  return (parentContext & flag) !== 0;
}

export function setDefaultShallowSuspenseListContext(
  parentContext: SuspenseContext,
): SuspenseContext {
  return parentContext & SubtreeSuspenseContextMask;
}

export function setShallowSuspenseListContext(
  parentContext: SuspenseContext,
  shallowContext: ShallowSuspenseContext,
): SuspenseContext {
  return (parentContext & SubtreeSuspenseContextMask) | shallowContext;
}

export function pushSuspenseListContext(
  fiber: Fiber,
  newContext: SuspenseContext,
): void {
  push(suspenseStackCursor, newContext, fiber);
}

export function popSuspenseListContext(fiber: Fiber): void {
  pop(suspenseStackCursor, fiber);
}
