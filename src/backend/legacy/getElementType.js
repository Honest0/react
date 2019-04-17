// @flow
import {
  ElementTypeClass,
  ElementTypeOtherOrUnknown,
} from 'src/devtools/types';

import type { InternalInstance } from './renderer';
import type { ElementType } from 'src/devtools/types';

export default function getElementType(
  internalInstance: InternalInstance
): ElementType {
  // != used deliberately here to catch undefined and null
  if (internalInstance._currentElement != null) {
    const elementType = internalInstance._currentElement.type;
    if (typeof elementType === 'function') {
      return ElementTypeClass;
    }
  }

  return ElementTypeOtherOrUnknown;
}
