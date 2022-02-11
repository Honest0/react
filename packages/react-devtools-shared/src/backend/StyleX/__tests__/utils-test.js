/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('Stylex plugin utils', () => {
  let getStyleXData;
  let styleElements;

  function defineStyles(style) {
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.appendChild(document.createTextNode(style));

    styleElements.push(styleElement);

    document.head.appendChild(styleElement);
  }

  beforeEach(() => {
    getStyleXData = require('../utils').getStyleXData;

    styleElements = [];
  });

  afterEach(() => {
    styleElements.forEach(styleElement => {
      document.head.removeChild(styleElement);
    });
  });

  it('should gracefully handle empty values', () => {
    expect(getStyleXData(null)).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {},
        "sources": Array [],
      }
    `);

    expect(getStyleXData(undefined)).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {},
        "sources": Array [],
      }
    `);

    expect(getStyleXData('')).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {},
        "sources": Array [],
      }
    `);

    expect(getStyleXData([undefined])).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {},
        "sources": Array [],
      }
    `);
  });

  it('should support simple style objects', () => {
    defineStyles(`
      .foo {
        display: flex;
      }
      .bar: {
        align-items: center;
      }
      .baz {
        flex-direction: center;
      }
    `);

    expect(
      getStyleXData({
        // The source/module styles are defined in
        Example__style: 'Example__style',

        // Map of CSS style to StyleX class name, booleans, or nested structures
        display: 'foo',
        flexDirection: 'baz',
        alignItems: 'bar',
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {
          "alignItems": "center",
          "display": "flex",
          "flexDirection": "center",
        },
        "sources": Array [
          "Example__style",
        ],
      }
    `);
  });

  it('should support multiple style objects', () => {
    defineStyles(`
      .foo {
        display: flex;
      }
      .bar: {
        align-items: center;
      }
      .baz {
        flex-direction: center;
      }
    `);

    expect(
      getStyleXData([
        {Example1__style: 'Example1__style', display: 'foo'},
        {
          Example2__style: 'Example2__style',
          flexDirection: 'baz',
          alignItems: 'bar',
        },
      ]),
    ).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {
          "alignItems": "center",
          "display": "flex",
          "flexDirection": "center",
        },
        "sources": Array [
          "Example1__style",
          "Example2__style",
        ],
      }
    `);
  });

  it('should filter empty rules', () => {
    defineStyles(`
      .foo {
        display: flex;
      }
      .bar: {
        align-items: center;
      }
      .baz {
        flex-direction: center;
      }
    `);

    expect(
      getStyleXData([
        false,
        {Example1__style: 'Example1__style', display: 'foo'},
        false,
        false,
        {
          Example2__style: 'Example2__style',
          flexDirection: 'baz',
          alignItems: 'bar',
        },
        false,
      ]),
    ).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {
          "alignItems": "center",
          "display": "flex",
          "flexDirection": "center",
        },
        "sources": Array [
          "Example1__style",
          "Example2__style",
        ],
      }
    `);
  });

  it('should support pseudo-classes', () => {
    defineStyles(`
      .foo {
        color: black;
      }
      .bar: {
        color: blue;
      }
      .baz {
        text-decoration: none;
      }
    `);

    expect(
      getStyleXData({
        // The source/module styles are defined in
        Example__style: 'Example__style',

        // Map of CSS style to StyleX class name, booleans, or nested structures
        color: 'foo',
        ':hover': {
          color: 'bar',
          textDecoration: 'baz',
        },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {
          ":hover": Object {
            "color": "blue",
            "textDecoration": "none",
          },
          "color": "black",
        },
        "sources": Array [
          "Example__style",
        ],
      }
    `);
  });

  it('should support nested selectors', () => {
    defineStyles(`
      .foo {
        display: flex;
      }
      .bar: {
        align-items: center;
      }
      .baz {
        flex-direction: center;
      }
    `);

    expect(
      getStyleXData([
        {Example1__style: 'Example1__style', display: 'foo'},
        false,
        [
          false,
          {Example2__style: 'Example2__style', flexDirection: 'baz'},
          {Example3__style: 'Example3__style', alignItems: 'bar'},
        ],
        false,
      ]),
    ).toMatchInlineSnapshot(`
      Object {
        "resolvedStyles": Object {
          "alignItems": "center",
          "display": "flex",
          "flexDirection": "center",
        },
        "sources": Array [
          "Example1__style",
          "Example2__style",
          "Example3__style",
        ],
      }
    `);
  });
});
