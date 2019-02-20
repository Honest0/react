// @flow

export const ElementTypeClass = 1;
export const ElementTypeFunction = 2;
export const ElementTypeContext = 3;
export const ElementTypeForwardRef = 4;
export const ElementTypeMemo = 5;
export const ElementTypeOtherOrUnknown = 6;
export const ElementTypeProfiler = 7;
export const ElementTypeRoot = 8;
export const ElementTypeSuspense = 9;

// Different types of elements displayed in the Elements tree.
// These types may be used to visually distinguish types,
// or to enable/disable certain functionality.
export type ElementType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Each element on the frontend corresponds to a Fiber on the backend.
// Some of its information (e.g. id, type, displayName) come from the backend.
// Other bits (e.g. weight and depth) are computed on the frontend for windowing and display purposes.
// Elements are udpated on a push basis– meaning the backend pushes updates to the frontend when needed.
export type Element = {|
  id: number,
  parentID: number,
  children: Array<number>,
  type: ElementType,
  displayName: string | null,
  key: number | string | null,

  // Owner (if available)
  ownerID: number,

  // How many levels deep within the tree is this element?
  // This determines how much indentation (left padding) should be used in the Elements tree.
  depth: number,

  // How many nodes (including itself) are below this Element within the tree.
  // This property is used to quickly determine the total number of Elements,
  // and the Element at any given index (for windowing purposes).
  weight: number,
|};

export type Owner = {|
  displayName: string,
  id: number,
|};

export type InspectedElement = {|
  id: number,

  // Does the current renderer support editable hooks?
  canEditHooks: boolean,

  // Does the current renderer support editable function props?
  canEditFunctionProps: boolean,

  // Inspectable properties.
  context: Object | null,
  hooks: Object | null,
  props: Object | null,
  state: Object | null,

  // List of owners
  owners: Array<Owner> | null,

  // Location of component in source coude.
  source: Object | null,
|};

// TODO: Add profiling type

export type DehydratedData = {|
  cleaned: Array<Array<string>>,
  data: Object,
|};
