/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable quotes */
'use strict';

const babel = require('@babel/core');
const codeFrame = require('@babel/code-frame');
const {wrap} = require('jest-snapshot-serializer-raw');

function transform(input, options) {
  return wrap(
    babel.transform(input, {
      configFile: false,
      plugins: [
        '@babel/plugin-syntax-jsx',
        '@babel/plugin-transform-arrow-functions',
        ...(options && options.development
          ? [
              '@babel/plugin-transform-react-jsx-source',
              '@babel/plugin-transform-react-jsx-self',
            ]
          : []),
        [
          './packages/babel-plugin-react-jsx',
          {
            useBuiltIns: true,
            useCreateElement: false,
            ...options,
          },
        ],
      ],
    }).code
  );
}

describe('transform react to jsx', () => {
  it('fragment with no children', () => {
    expect(transform(`var x = <></>`)).toMatchSnapshot();
  });

  it('fragments', () => {
    expect(transform(`var x = <><div /></>`)).toMatchSnapshot();
  });

  it('fragments to set keys', () => {
    expect(
      transform(`var x = <React.Fragment key="foo"></React.Fragment>`)
    ).toMatchSnapshot();
  });

  it('React.fragment to set keys and source', () => {
    expect(
      transform(`var x = <React.Fragment key='foo'></React.Fragment>`, {
        development: true,
      })
    ).toMatchSnapshot();
  });

  it('fragments in dev mode (no key and source)', () => {
    expect(
      transform(`var x = <><div /></>`, {
        development: true,
      })
    ).toMatchSnapshot();
  });

  it('nonStatic children', () => {
    expect(
      transform(
        `var x = (
        <div>
          {[<span key={'0'} />, <span key={'1'} />]}
        </div>
      );
      `,
        {
          development: true,
        }
      )
    ).toMatchSnapshot();
  });

  it('static children', () => {
    expect(
      transform(
        `var x = (
        <div>
          <span />
          {[<span key={'0'} />, <span key={'1'} />]}
        </div>
      );
      `,
        {
          development: true,
        }
      )
    ).toMatchSnapshot();
  });

  it('uses jsxDEV instead of jsx in dev mode', () => {
    expect(
      transform(`var x = <span propOne="one">Hi</span>`, {development: true})
    ).toMatchSnapshot();
  });

  it('properly passes in source and self', () => {
    expect(
      transform(`var x = <div />;`, {development: true})
    ).toMatchSnapshot();
  });

  it('should properly handle potentially null variables', () => {
    expect(
      transform(`
        var foo = null;
        var x = <div {...foo} />;
      `)
    ).toMatchSnapshot();
  });

  it('properly handles keys', () => {
    expect(
      transform(`var x = (
        <div>
          <div key="1" />
          <div key="2" meow="wolf" />
          <div key="3" />
        </div>
      );`)
    ).toMatchSnapshot();
  });

  it('uses createElement when the key comes after a spread', () => {
    expect(
      transform(`var x = (
        <div {...props} key="1" foo="bar" />
      );`)
    ).toMatchSnapshot();
  });

  it('uses jsx when the key comes before a spread', () => {
    expect(
      transform(`var x = (
        <div key="1" {...props} foo="bar" />
      );`)
    ).toMatchSnapshot();
  });

  it('should properly handle comments adjacent to children', () => {
    expect(
      transform(`
      var x = (
        <div>
          {/* A comment at the beginning */}
          {/* A second comment at the beginning */}
          <span>
            {/* A nested comment */}
          </span>
          {/* A sandwiched comment */}
          <br />
          {/* A comment at the end */}
          {/* A second comment at the end */}
        </div>
      );
    `)
    ).toMatchSnapshot();
  });

  it('adds appropriate new lines when using spread attribute', () => {
    expect(transform(`<Component {...props} sound="moo" />`)).toMatchSnapshot();
  });

  it('arrow functions', () => {
    expect(
      transform(`
        var foo = function () {
          return () => <this />;
        };

        var bar = function () {
          return () => <this.foo />;
        };

      `)
    ).toMatchSnapshot();
  });

  it('assignment', () => {
    expect(
      transform(`var div = <Component {...props} foo="bar" />`)
    ).toMatchSnapshot();
  });

  it('concatenates adjacent string literals', () => {
    expect(
      transform(`
      var x =
        <div>
          foo
          {"bar"}
          baz
          <div>
            buz
            bang
          </div>
          qux
          {null}
          quack
        </div>
      `)
    ).toMatchSnapshot();
  });

  it('should allow constructor as prop', () => {
    expect(transform(`<Component constructor="foo" />;`)).toMatchSnapshot();
  });

  it('should allow deeper js namespacing', () => {
    expect(
      transform(`<Namespace.DeepNamespace.Component />;`)
    ).toMatchSnapshot();
  });

  it('should allow elements as attributes', () => {
    expect(transform(`<div attr=<div /> />`)).toMatchSnapshot();
  });

  it('should allow js namespacing', () => {
    expect(transform(`<Namespace.Component />;`)).toMatchSnapshot();
  });

  it('should allow nested fragments', () => {
    expect(
      transform(`
        <div>
          <  >
            <>
              <span>Hello</span>
              <span>world</span>
            </>
            <>
              <span>Goodbye</span>
              <span>world</span>
            </>
          </>
        </div>
      `)
    ).toMatchSnapshot();
  });

  it('should avoid wrapping in extra parens if not needed', () => {
    expect(
      transform(`
        var x = <div>
          <Component />
        </div>;

        var x = <div>
          {props.children}
        </div>;

        var x = <Composite>
          {props.children}
        </Composite>;

        var x = <Composite>
          <Composite2 />
        </Composite>;
      `)
    ).toMatchSnapshot();
  });

  it('should convert simple tags', () => {
    expect(transform(`var x = <div></div>;`)).toMatchSnapshot();
  });

  it('should convert simple text', () => {
    expect(transform(`var x = <div>text</div>;`)).toMatchSnapshot();
  });

  it('should disallow spread children', () => {
    let _error;
    const code = `<div>{...children}</div>;`;
    try {
      transform(code);
    } catch (error) {
      _error = error;
    }
    expect(_error).toEqual(
      new SyntaxError(
        'undefined: Spread children are not supported in React.' +
          '\n' +
          codeFrame.codeFrameColumns(
            code,
            {start: {line: 1, column: 6}},
            {highlightCode: true}
          )
      )
    );
  });

  it('should escape xhtml jsxattribute', () => {
    expect(
      transform(`
        <div id="wôw" />;
        <div id="\w" />;
        <div id="w &lt; w" />;
      `)
    ).toMatchSnapshot();
  });

  it('should escape xhtml jsxtext', () => {
    /* eslint-disable no-irregular-whitespace */
    expect(
      transform(`
        <div>wow</div>;
        <div>wôw</div>;

        <div>w & w</div>;
        <div>w &amp; w</div>;

        <div>w &nbsp; w</div>;
        <div>this should not parse as unicode: \u00a0</div>;
        <div>this should parse as nbsp:   </div>;
        <div>this should parse as unicode: {'\u00a0 '}</div>;

        <div>w &lt; w</div>;
      `)
    ).toMatchSnapshot();
    /*eslint-enable */
  });

  it('should handle attributed elements', () => {
    expect(
      transform(`
        var HelloMessage = React.createClass({
          render: function() {
            return <div>Hello {this.props.name}</div>;
          }
        });

        React.render(<HelloMessage name={
          <span>
            Sebastian
          </span>
        } />, mountNode);
      `)
    ).toMatchSnapshot();
  });

  it('should handle has own property correctly', () => {
    expect(
      transform(`<hasOwnProperty>testing</hasOwnProperty>;`)
    ).toMatchSnapshot();
  });

  it('should have correct comma in nested children', () => {
    expect(
      transform(`
        var x = <div>
          <div><br /></div>
          <Component>{foo}<br />{bar}</Component>
          <br />
        </div>;
      `)
    ).toMatchSnapshot();
  });

  it('should insert commas after expressions before whitespace', () => {
    expect(
      transform(`
        var x =
          <div
            attr1={
              "foo" + "bar"
            }
            attr2={
              "foo" + "bar" +

              "baz" + "bug"
            }
            attr3={
              "foo" + "bar" +
              "baz" + "bug"
            }
            attr4="baz">
          </div>
    `)
    ).toMatchSnapshot();
  });

  it('should not add quotes to identifier names', () => {
    expect(
      transform(`var e = <F aaa new const var default foo-bar/>;`)
    ).toMatchSnapshot();
  });

  it('should not strip nbsp even couple with other whitespace', () => {
    expect(transform(`<div>&nbsp; </div>;`)).toMatchSnapshot();
  });

  it('should not strip tags with a single child of nbsp', () => {
    expect(transform(`<div>&nbsp;</div>;`)).toMatchSnapshot();
  });

  it('should properly handle comments between props', () => {
    expect(
      transform(`
        var x = (
          <div
            /* a multi-line
              comment */
            attr1="foo">
            <span // a double-slash comment
              attr2="bar"
            />
          </div>
        );
      `)
    ).toMatchSnapshot();
  });

  it('should quote jsx attributes', () => {
    expect(
      transform(`<button data-value='a value'>Button</button>`)
    ).toMatchSnapshot();
  });

  it('should support xml namespaces if flag', () => {
    expect(
      transform('<f:image n:attr />', {throwIfNamespace: false})
    ).toMatchSnapshot();
  });

  it('should throw error namespaces if not flag', () => {
    let _error;
    const code = `<f:image />`;
    try {
      transform(code);
    } catch (error) {
      _error = error;
    }
    expect(_error).toEqual(
      new SyntaxError(
        "undefined: Namespace tags are not supported by default. React's " +
          "JSX doesn't support namespace tags. You can turn on the " +
          "'throwIfNamespace' flag to bypass this warning." +
          '\n' +
          codeFrame.codeFrameColumns(
            code,
            {start: {line: 1, column: 2}},
            {highlightCode: true}
          )
      )
    );
  });

  it('should transform known hyphenated tags', () => {
    expect(transform(`<font-face />`)).toMatchSnapshot();
  });

  it('wraps props in react spread for first spread attributes', () => {
    expect(transform(`<Component {...x} y={2} z />`)).toMatchSnapshot();
  });

  it('wraps props in react spread for last spread attributes', () => {
    expect(transform(`<Component y={2} z { ... x } />`)).toMatchSnapshot();
  });

  it('wraps props in react spread for middle spread attributes', () => {
    expect(transform(`<Component y={2} { ... x } z />`)).toMatchSnapshot();
  });

  it('useBuiltIns false uses extend instead of Object.assign', () => {
    expect(
      transform(`<Component y={2} {...x} />`, {useBuiltIns: false})
    ).toMatchSnapshot();
  });

  it('should not contain duplicate children key in props object', () => {
    expect(
      transform(`<Component children={1}>2</Component>`)
    ).toMatchSnapshot();
  });
});
