/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactScopeMethods} from 'shared/ReactTypes';
import type {KeyboardEvent} from 'react-interactions/events/keyboard';

function getTabbableNodes(scope: ReactScopeMethods) {
  const tabbableNodes = scope.getScopedNodes();
  if (tabbableNodes === null || tabbableNodes.length === 0) {
    return [null, null, null, 0, null];
  }
  const firstTabbableElem = tabbableNodes[0];
  const lastTabbableElem = tabbableNodes[tabbableNodes.length - 1];
  const currentIndex = tabbableNodes.indexOf(document.activeElement);
  let focusedElement = null;
  if (currentIndex !== -1) {
    focusedElement = tabbableNodes[currentIndex];
  }
  return [
    tabbableNodes,
    firstTabbableElem,
    lastTabbableElem,
    currentIndex,
    focusedElement,
  ];
}

export function focusFirst(scope: ReactScopeMethods): void {
  const [, firstTabbableElem] = getTabbableNodes(scope);
  focusElem(firstTabbableElem);
}

function focusElem(elem: null | HTMLElement): void {
  if (elem !== null) {
    elem.focus();
  }
}

export function focusNext(
  scope: ReactScopeMethods,
  event?: KeyboardEvent,
  contain?: boolean,
): void {
  const [
    tabbableNodes,
    firstTabbableElem,
    lastTabbableElem,
    currentIndex,
    focusedElement,
  ] = getTabbableNodes(scope);

  if (focusedElement === null) {
    if (event) {
      event.continuePropagation();
    }
  } else if (focusedElement === lastTabbableElem) {
    if (contain) {
      focusElem(firstTabbableElem);
      if (event) {
        event.preventDefault();
      }
    } else if (event) {
      event.continuePropagation();
    }
  } else {
    focusElem((tabbableNodes: any)[currentIndex + 1]);
    if (event) {
      event.preventDefault();
    }
  }
}

export function focusPrevious(
  scope: ReactScopeMethods,
  event?: KeyboardEvent,
  contain?: boolean,
): void {
  const [
    tabbableNodes,
    firstTabbableElem,
    lastTabbableElem,
    currentIndex,
    focusedElement,
  ] = getTabbableNodes(scope);

  if (focusedElement === null) {
    if (event) {
      event.continuePropagation();
    }
  } else if (focusedElement === firstTabbableElem) {
    if (contain) {
      focusElem(lastTabbableElem);
      if (event) {
        event.preventDefault();
      }
    } else if (event) {
      event.continuePropagation();
    }
  } else {
    focusElem((tabbableNodes: any)[currentIndex - 1]);
    if (event) {
      event.preventDefault();
    }
  }
}

export function getNextScope(
  scope: ReactScopeMethods,
): null | ReactScopeMethods {
  const allScopes = scope.getChildrenFromRoot();
  if (allScopes === null) {
    return null;
  }
  const currentScopeIndex = allScopes.indexOf(scope);
  if (currentScopeIndex === -1 || currentScopeIndex === allScopes.length - 1) {
    return null;
  }
  return allScopes[currentScopeIndex + 1];
}

export function getPreviousScope(
  scope: ReactScopeMethods,
): null | ReactScopeMethods {
  const allScopes = scope.getChildrenFromRoot();
  if (allScopes === null) {
    return null;
  }
  const currentScopeIndex = allScopes.indexOf(scope);
  if (currentScopeIndex <= 0) {
    return null;
  }
  return allScopes[currentScopeIndex - 1];
}

const tabIndexDesc = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'tabIndex',
);
const tabIndexSetter = (tabIndexDesc: any).set;

export function setElementCanTab(elem: HTMLElement, canTab: boolean): void {
  let tabIndexState = (elem: any)._tabIndexState;
  if (!tabIndexState) {
    tabIndexState = {
      value: elem.tabIndex,
      canTab,
    };
    (elem: any)._tabIndexState = tabIndexState;
    if (!canTab) {
      elem.tabIndex = -1;
    }
    // We track the tabIndex value so we can restore the correct
    // tabIndex after we're done with it.
    // $FlowFixMe: Flow comoplains that we are missing value?
    Object.defineProperty(elem, 'tabIndex', {
      enumerable: false,
      configurable: true,
      get() {
        return tabIndexState.canTab ? tabIndexState.value : -1;
      },
      set(val) {
        if (tabIndexState.canTab) {
          tabIndexSetter.call(elem, val);
        }
        tabIndexState.value = val;
      },
    });
  } else if (tabIndexState.canTab !== canTab) {
    tabIndexSetter.call(elem, canTab ? tabIndexState.value : -1);
    tabIndexState.canTab = canTab;
  }
}
