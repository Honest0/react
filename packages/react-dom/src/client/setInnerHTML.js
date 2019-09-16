/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {Namespaces} from '../shared/DOMNamespaces';
import createMicrosoftUnsafeLocalFunction from '../shared/createMicrosoftUnsafeLocalFunction';
import warning from 'shared/warning';
import type {TrustedValue} from './ToStringValue';
import {enableTrustedTypesIntegration} from 'shared/ReactFeatureFlags';

// SVG temp container for IE lacking innerHTML
let reusableSVGContainer;

/**
 * Set the innerHTML property of a node
 *
 * @param {DOMElement} node
 * @param {string} html
 * @internal
 */
const setInnerHTML = createMicrosoftUnsafeLocalFunction(function(
  node: Element,
  html: string | TrustedValue,
): void {
  // IE does not have innerHTML for SVG nodes, so instead we inject the
  // new markup in a temp node and then move the child nodes across into
  // the target node
  if (node.namespaceURI === Namespaces.svg) {
    if (enableTrustedTypesIntegration && __DEV__) {
      warning(
        // $FlowExpectedError - trustedTypes are defined only in some browsers or with polyfill
        typeof trustedTypes === 'undefined',
        "Using 'dangerouslySetInnerHTML' in an svg element with " +
          'Trusted Types enabled in an Internet Explorer will cause ' +
          'the trusted value to be converted to string. Assigning string ' +
          "to 'innerHTML' will throw an error if Trusted Types are enforced. " +
          "You can try to wrap your svg element inside a div and use 'dangerouslySetInnerHTML' " +
          'on the enclosing div instead.',
      );
    }
    if (!('innerHTML' in node)) {
      reusableSVGContainer =
        reusableSVGContainer || document.createElement('div');
      reusableSVGContainer.innerHTML =
        '<svg>' + html.valueOf().toString() + '</svg>';
      const svgNode = reusableSVGContainer.firstChild;
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
      while (svgNode.firstChild) {
        node.appendChild(svgNode.firstChild);
      }
    } else {
      node.innerHTML = (html: any);
    }
  } else {
    node.innerHTML = (html: any);
  }
});

export default setInnerHTML;
