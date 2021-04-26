/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {Source} from 'shared/ReactElementType';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {
  ComponentFilter,
  ElementType,
} from 'react-devtools-shared/src/types';
import type {ResolveNativeStyle} from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';

type BundleType =
  | 0 // PROD
  | 1; // DEV

export type WorkTag = number;
export type WorkFlags = number;
export type ExpirationTime = number;

export type WorkTagMap = {|
  CacheComponent: WorkTag,
  ClassComponent: WorkTag,
  ContextConsumer: WorkTag,
  ContextProvider: WorkTag,
  CoroutineComponent: WorkTag,
  CoroutineHandlerPhase: WorkTag,
  DehydratedSuspenseComponent: WorkTag,
  ForwardRef: WorkTag,
  Fragment: WorkTag,
  FunctionComponent: WorkTag,
  HostComponent: WorkTag,
  HostPortal: WorkTag,
  HostRoot: WorkTag,
  HostText: WorkTag,
  IncompleteClassComponent: WorkTag,
  IndeterminateComponent: WorkTag,
  LazyComponent: WorkTag,
  LegacyHiddenComponent: WorkTag,
  MemoComponent: WorkTag,
  Mode: WorkTag,
  OffscreenComponent: WorkTag,
  Profiler: WorkTag,
  ScopeComponent: WorkTag,
  SimpleMemoComponent: WorkTag,
  SuspenseComponent: WorkTag,
  SuspenseListComponent: WorkTag,
  YieldComponent: WorkTag,
|};

// TODO: If it's useful for the frontend to know which types of data an Element has
// (e.g. props, state, context, hooks) then we could add a bitmask field for this
// to keep the number of attributes small.
export type FiberData = {|
  key: string | null,
  displayName: string | null,
  type: ElementType,
|};

export type NativeType = Object;
export type RendererID = number;

type Dispatcher = any;
export type CurrentDispatcherRef = {|current: null | Dispatcher|};

export type GetDisplayNameForFiberID = (
  id: number,
  findNearestUnfilteredAncestor?: boolean,
) => string | null;

export type GetFiberIDForNative = (
  component: NativeType,
  findNearestUnfilteredAncestor?: boolean,
) => number | null;
export type FindNativeNodesForFiberID = (id: number) => ?Array<NativeType>;

export type ReactProviderType<T> = {
  $$typeof: Symbol | number,
  _context: ReactContext<T>,
  ...
};

export type ReactRenderer = {
  findFiberByHostInstance: (hostInstance: NativeType) => ?Fiber,
  version: string,
  rendererPackageName: string,
  bundleType: BundleType,
  // 16.9+
  overrideHookState?: ?(
    fiber: Object,
    id: number,
    path: Array<string | number>,
    value: any,
  ) => void,
  // 17+
  overrideHookStateDeletePath?: ?(
    fiber: Object,
    id: number,
    path: Array<string | number>,
  ) => void,
  // 17+
  overrideHookStateRenamePath?: ?(
    fiber: Object,
    id: number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  // 16.7+
  overrideProps?: ?(
    fiber: Object,
    path: Array<string | number>,
    value: any,
  ) => void,
  // 17+
  overridePropsDeletePath?: ?(
    fiber: Object,
    path: Array<string | number>,
  ) => void,
  // 17+
  overridePropsRenamePath?: ?(
    fiber: Object,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  // 16.9+
  scheduleUpdate?: ?(fiber: Object) => void,
  setSuspenseHandler?: ?(shouldSuspend: (fiber: Object) => boolean) => void,
  // Only injected by React v16.8+ in order to support hooks inspection.
  currentDispatcherRef?: CurrentDispatcherRef,
  // Only injected by React v16.9+ in DEV mode.
  // Enables DevTools to append owners-only component stack to error messages.
  getCurrentFiber?: () => Fiber | null,
  // 17.0.2+
  reconcilerVersion?: string,
  // Uniquely identifies React DOM v15.
  ComponentTree?: any,
  // Present for React DOM v12 (possibly earlier) through v15.
  Mount?: any,
  ...
};

export type ChangeDescription = {|
  context: Array<string> | boolean | null,
  didHooksChange: boolean,
  isFirstMount: boolean,
  props: Array<string> | null,
  state: Array<string> | null,
  hooks?: Array<number> | null,
|};

export type CommitDataBackend = {|
  // Tuple of fiber ID and change description
  changeDescriptions: Array<[number, ChangeDescription]> | null,
  duration: number,
  // Only available in certain (newer) React builds,
  effectDuration: number | null,
  // Tuple of fiber ID and actual duration
  fiberActualDurations: Array<[number, number]>,
  // Tuple of fiber ID and computed "self" duration
  fiberSelfDurations: Array<[number, number]>,
  // Only available in certain (newer) React builds,
  passiveEffectDuration: number | null,
  priorityLevel: string | null,
  timestamp: number,
  updaters: Array<SerializedElement> | null,
|};

export type ProfilingDataForRootBackend = {|
  commitData: Array<CommitDataBackend>,
  displayName: string,
  // Tuple of Fiber ID and base duration
  initialTreeBaseDurations: Array<[number, number]>,
  rootID: number,
|};

// Profiling data collected by the renderer interface.
// This information will be passed to the frontend and combined with info it collects.
export type ProfilingDataBackend = {|
  dataForRoots: Array<ProfilingDataForRootBackend>,
  rendererID: number,
|};

export type PathFrame = {|
  key: string | null,
  index: number,
  displayName: string | null,
|};

export type PathMatch = {|
  id: number,
  isFullMatch: boolean,
|};

export type SerializedElement = {|
  displayName: string | null,
  id: number,
  key: number | string | null,
  type: ElementType,
|};

export type OwnersList = {|
  id: number,
  owners: Array<SerializedElement> | null,
|};

export type InspectedElement = {|
  id: number,

  displayName: string | null,

  // Does the current renderer support editable hooks and function props?
  canEditHooks: boolean,
  canEditFunctionProps: boolean,

  // Does the current renderer support advanced editing interface?
  canEditHooksAndDeletePaths: boolean,
  canEditHooksAndRenamePaths: boolean,
  canEditFunctionPropsDeletePaths: boolean,
  canEditFunctionPropsRenamePaths: boolean,

  // Is this Suspense, and can its value be overridden now?
  canToggleSuspense: boolean,

  // Can view component source location.
  canViewSource: boolean,

  // Does the component have legacy context attached to it.
  hasLegacyContext: boolean,

  // Inspectable properties.
  context: Object | null,
  hooks: Object | null,
  props: Object | null,
  state: Object | null,
  key: number | string | null,
  errors: Array<[string, number]>,
  warnings: Array<[string, number]>,

  // List of owners
  owners: Array<SerializedElement> | null,

  // Location of component in source code.
  source: Source | null,

  type: ElementType,

  // Meta information about the root this element belongs to.
  rootType: string | null,

  // Meta information about the renderer that created this element.
  rendererPackageName: string | null,
  rendererVersion: string | null,
|};

export const InspectElementFullDataType = 'full-data';
export const InspectElementNoChangeType = 'no-change';
export const InspectElementNotFoundType = 'not-found';

export type InspectElementFullData = {|
  id: number,
  responseID: number,
  type: 'full-data',
  value: InspectedElement,
|};

export type InspectElementHydratedPath = {|
  id: number,
  responseID: number,
  type: 'hydrated-path',
  path: Array<string | number>,
  value: any,
|};

export type InspectElementNoChange = {|
  id: number,
  responseID: number,
  type: 'no-change',
|};

export type InspectElementNotFound = {|
  id: number,
  responseID: number,
  type: 'not-found',
|};

export type InspectedElementPayload =
  | InspectElementFullData
  | InspectElementHydratedPath
  | InspectElementNoChange
  | InspectElementNotFound;

export type InstanceAndStyle = {|
  instance: Object | null,
  style: Object | null,
|};

type Type = 'props' | 'hooks' | 'state' | 'context';

export type RendererInterface = {
  cleanup: () => void,
  clearErrorsAndWarnings: () => void,
  clearErrorsForFiberID: (id: number) => void,
  clearWarningsForFiberID: (id: number) => void,
  copyElementPath: (id: number, path: Array<string | number>) => void,
  deletePath: (
    type: Type,
    id: number,
    hookID: ?number,
    path: Array<string | number>,
  ) => void,
  findNativeNodesForFiberID: FindNativeNodesForFiberID,
  flushInitialOperations: () => void,
  getBestMatchForTrackedPath: () => PathMatch | null,
  getFiberIDForNative: GetFiberIDForNative,
  getDisplayNameForFiberID: GetDisplayNameForFiberID,
  getInstanceAndStyle(id: number): InstanceAndStyle,
  getProfilingData(): ProfilingDataBackend,
  getOwnersList: (id: number) => Array<SerializedElement> | null,
  getPathForElement: (id: number) => Array<PathFrame> | null,
  handleCommitFiberRoot: (fiber: Object, commitPriority?: number) => void,
  handleCommitFiberUnmount: (fiber: Object) => void,
  handlePostCommitFiberRoot: (fiber: Object) => void,
  inspectElement: (
    requestID: number,
    id: number,
    inspectedPaths: Object,
  ) => InspectedElementPayload,
  logElementToConsole: (id: number) => void,
  overrideSuspense: (id: number, forceFallback: boolean) => void,
  overrideValueAtPath: (
    type: Type,
    id: number,
    hook: ?number,
    path: Array<string | number>,
    value: any,
  ) => void,
  prepareViewAttributeSource: (
    id: number,
    path: Array<string | number>,
  ) => void,
  prepareViewElementSource: (id: number) => void,
  renamePath: (
    type: Type,
    id: number,
    hookID: ?number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  renderer: ReactRenderer | null,
  setTraceUpdatesEnabled: (enabled: boolean) => void,
  setTrackedPath: (path: Array<PathFrame> | null) => void,
  startProfiling: (recordChangeDescriptions: boolean) => void,
  stopProfiling: () => void,
  storeAsGlobal: (
    id: number,
    path: Array<string | number>,
    count: number,
  ) => void,
  updateComponentFilters: (componentFilters: Array<ComponentFilter>) => void,
  ...
};

export type Handler = (data: any) => void;

export type DevToolsHook = {
  listeners: {[key: string]: Array<Handler>, ...},
  rendererInterfaces: Map<RendererID, RendererInterface>,
  renderers: Map<RendererID, ReactRenderer>,

  emit: (event: string, data: any) => void,
  getFiberRoots: (rendererID: RendererID) => Set<Object>,
  inject: (renderer: ReactRenderer) => number | null,
  on: (event: string, handler: Handler) => void,
  off: (event: string, handler: Handler) => void,
  reactDevtoolsAgent?: ?Object,
  sub: (event: string, handler: Handler) => () => void,

  // Used by react-native-web and Flipper/Inspector
  resolveRNStyle?: ResolveNativeStyle,
  nativeStyleEditorValidAttributes?: $ReadOnlyArray<string>,

  // React uses these methods.
  checkDCE: (fn: Function) => void,
  onCommitFiberUnmount: (rendererID: RendererID, fiber: Object) => void,
  onCommitFiberRoot: (
    rendererID: RendererID,
    fiber: Object,
    // Added in v16.9 to support Profiler priority labels
    commitPriority?: number,
    // Added in v16.9 to support Fast Refresh
    didError?: boolean,
  ) => void,
  ...
};
