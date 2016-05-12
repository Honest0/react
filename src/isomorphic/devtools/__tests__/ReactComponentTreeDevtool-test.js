/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

describe('ReactComponentTreeDevtool', () => {
  var React;
  var ReactDOM;
  var ReactDOMServer;
  var ReactInstanceMap;
  var ReactComponentTreeDevtool;

  beforeEach(() => {
    jest.resetModuleRegistry();

    React = require('React');
    ReactDOM = require('ReactDOM');
    ReactDOMServer = require('ReactDOMServer');
    ReactInstanceMap = require('ReactInstanceMap');
    ReactComponentTreeDevtool = require('ReactComponentTreeDevtool');
  });

  function getRootDisplayNames() {
    return ReactComponentTreeDevtool.getRootIDs()
      .map(ReactComponentTreeDevtool.getDisplayName);
  }

  function getRegisteredDisplayNames() {
    return ReactComponentTreeDevtool.getRegisteredIDs()
      .map(ReactComponentTreeDevtool.getDisplayName);
  }

  function getTree(rootID, options = {}) {
    var {
      includeOwnerDisplayName = false,
      includeParentDisplayName = false,
      expectedParentID = null,
    } = options;

    var result = {
      displayName: ReactComponentTreeDevtool.getDisplayName(rootID),
    };

    var ownerID = ReactComponentTreeDevtool.getOwnerID(rootID);
    var parentID = ReactComponentTreeDevtool.getParentID(rootID);
    expect(parentID).toBe(expectedParentID);

    if (includeParentDisplayName && parentID) {
      result.parentDisplayName = ReactComponentTreeDevtool.getDisplayName(parentID);
    }
    if (includeOwnerDisplayName && ownerID) {
      result.ownerDisplayName = ReactComponentTreeDevtool.getDisplayName(ownerID);
    }

    var childIDs = ReactComponentTreeDevtool.getChildIDs(rootID);
    var text = ReactComponentTreeDevtool.getText(rootID);
    if (text != null) {
      result.text = text;
    } else {
      result.children = childIDs.map(childID =>
        getTree(childID, {...options, expectedParentID: rootID })
      );
    }

    return result;
  }

  function assertTreeMatches(pairs, options) {
    if (!Array.isArray(pairs[0])) {
      pairs = [pairs];
    }

    var node = document.createElement('div');
    var currentElement;
    var rootInstance;

    class Wrapper extends React.Component {
      render() {
        rootInstance = ReactInstanceMap.get(this);
        return currentElement;
      }
    }

    function getActualTree() {
      return getTree(rootInstance._debugID, options).children[0];
    }

    // Mount once, render updates, then unmount.
    // Ensure the tree is correct on every step.
    pairs.forEach(([element, expectedTree]) => {
      currentElement = element;

      // Mount a new tree or update the existing tree.
      ReactDOM.render(<Wrapper />, node);
      expect(getActualTree()).toEqual(expectedTree);

      // Purging should have no effect
      // on the tree we expect to see.
      ReactComponentTreeDevtool.purgeUnmountedComponents();
      expect(getActualTree()).toEqual(expectedTree);
    });

    // Unmounting the root node should purge
    // the whole subtree automatically.
    ReactDOM.unmountComponentAtNode(node);
    expect(getActualTree()).toBe(undefined);
    expect(getRootDisplayNames()).toEqual([]);
    expect(getRegisteredDisplayNames()).toEqual([]);

    // Server render every pair.
    // Ensure the tree is correct on every step.
    pairs.forEach(([element, expectedTree]) => {
      currentElement = element;

      // Rendering to string should not produce any entries
      // because ReactDebugTool purges it when the flush ends.
      ReactDOMServer.renderToString(<Wrapper />);
      expect(getActualTree()).toBe(undefined);
      expect(getRootDisplayNames()).toEqual([]);
      expect(getRegisteredDisplayNames()).toEqual([]);

      // To test it, we tell the devtool to ignore next purge
      // so the cleanup request by ReactDebugTool is ignored.
      // This lets us make assertions on the actual tree.
      ReactComponentTreeDevtool._preventPurging = true;
      ReactDOMServer.renderToString(<Wrapper />);
      ReactComponentTreeDevtool._preventPurging = false;
      expect(getActualTree()).toEqual(expectedTree);

      // Purge manually since we skipped the automatic purge.
      ReactComponentTreeDevtool.purgeUnmountedComponents();
      expect(getActualTree()).toBe(undefined);
      expect(getRootDisplayNames()).toEqual([]);
      expect(getRegisteredDisplayNames()).toEqual([]);
    });
  }

  describe('mount', () => {
    it('uses displayName or Unknown for classic components', () => {
      var Foo = React.createClass({
        render() {
          return null;
        },
      });
      Foo.displayName = 'Bar';
      var Baz = React.createClass({
        render() {
          return null;
        },
      });
      var Qux = React.createClass({
        render() {
          return null;
        },
      });
      delete Qux.displayName;

      var element = <div><Foo /><Baz /><Qux /></div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: 'Bar',
          children: [],
        }, {
          displayName: 'Baz',
          children: [],
        }, {
          displayName: 'Unknown',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('uses displayName, name, or ReactComponent for modern components', () => {
      class Foo extends React.Component {
        render() {
          return null;
        }
      }
      Foo.displayName = 'Bar';
      class Baz extends React.Component {
        render() {
          return null;
        }
      }
      class Qux extends React.Component {
        render() {
          return null;
        }
      }
      delete Qux.name;

      var element = <div><Foo /><Baz /><Qux /></div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: 'Bar',
          children: [],
        }, {
          displayName: 'Baz',
          children: [],
        }, {
          // Note: Ideally fallback name should be consistent (e.g. "Unknown")
          displayName: 'ReactComponent',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('uses displayName, name, or Object for factory components', () => {
      function Foo() {
        return {
          render() {
            return null;
          },
        };
      }
      Foo.displayName = 'Bar';
      function Baz() {
        return {
          render() {
            return null;
          },
        };
      }
      function Qux() {
        return {
          render() {
            return null;
          },
        };
      }
      delete Qux.name;

      var element = <div><Foo /><Baz /><Qux /></div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: 'Bar',
          children: [],
        }, {
          displayName: 'Baz',
          children: [],
        }, {
          displayName: 'Unknown',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('uses displayName, name, or StatelessComponent for functional components', () => {
      function Foo() {
        return null;
      }
      Foo.displayName = 'Bar';
      function Baz() {
        return null;
      }
      function Qux() {
        return null;
      }
      delete Qux.name;

      var element = <div><Foo /><Baz /><Qux /></div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: 'Bar',
          children: [],
        }, {
          displayName: 'Baz',
          children: [],
        }, {
          displayName: 'Unknown',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a native tree correctly', () => {
      var element = (
        <div>
          <p>
            <span>
              Hi!
            </span>
            Wow.
          </p>
          <hr />
        </div>
      );
      var tree = {
        displayName: 'div',
        children: [{
          displayName: 'p',
          children: [{
            displayName: 'span',
            children: [{
              displayName: '#text',
              text: 'Hi!',
            }],
          }, {
            displayName: '#text',
            text: 'Wow.',
          }],
        }, {
          displayName: 'hr',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a simple tree with composites correctly', () => {
      class Foo extends React.Component {
        render() {
          return <div />;
        }
      }

      var element = <Foo />;
      var tree = {
        displayName: 'Foo',
        children: [{
          displayName: 'div',
          children: [],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a tree with composites correctly', () => {
      var Qux = React.createClass({
        render() {
          return null;
        },
      });
      function Foo() {
        return {
          render() {
            return <Qux />;
          },
        };
      }
      function Bar({children}) {
        return <h1>{children}</h1>;
      }
      class Baz extends React.Component {
        render() {
          return (
            <div>
              <Foo />
              <Bar>
                <span>Hi,</span>
                Mom
              </Bar>
              <a href="#">Click me.</a>
            </div>
          );
        }
      }

      var element = <Baz />;
      var tree = {
        displayName: 'Baz',
        children: [{
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [{
              displayName: 'Qux',
              children: [],
            }],
          }, {
            displayName: 'Bar',
            children: [{
              displayName: 'h1',
              children: [{
                displayName: 'span',
                children: [{
                  displayName: '#text',
                  text: 'Hi,',
                }],
              }, {
                displayName: '#text',
                text: 'Mom',
              }],
            }],
          }, {
            displayName: 'a',
            children: [{
              displayName: '#text',
              text: 'Click me.',
            }],
          }],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('ignores null children', () => {
      class Foo extends React.Component {
        render() {
          return null;
        }
      }
      var element = <Foo />;
      var tree = {
        displayName: 'Foo',
        children: [],
      };
      assertTreeMatches([element, tree]);
    });

    it('ignores false children', () => {
      class Foo extends React.Component {
        render() {
          return false;
        }
      }
      var element = <Foo />;
      var tree = {
        displayName: 'Foo',
        children: [],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports text nodes as children', () => {
      var element = <div>{'1'}{2}</div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: '#text',
          text: '1',
        }, {
          displayName: '#text',
          text: '2',
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a single text node as a child', () => {
      var element = <div>{'1'}</div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: '#text',
          text: '1',
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a single number node as a child', () => {
      var element = <div>{42}</div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: '#text',
          text: '42',
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports a zero as a child', () => {
      var element = <div>{0}</div>;
      var tree = {
        displayName: 'div',
        children: [{
          displayName: '#text',
          text: '0',
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('skips empty nodes for multiple children', () => {
      function Foo() {
        return <div />;
      }
      var element = (
        <div>
          {'hi'}
          {false}
          {42}
          {null}
          <Foo />
        </div>
      );
      var tree = {
        displayName: 'div',
        children: [{
          displayName: '#text',
          text: 'hi',
        }, {
          displayName: '#text',
          text: '42',
        }, {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        }],
      };
      assertTreeMatches([element, tree]);
    });

    it('reports html content as no children', () => {
      var element = <div dangerouslySetInnerHTML={{__html: 'Bye.'}} />;
      var tree = {
        displayName: 'div',
        children: [],
      };
      assertTreeMatches([element, tree]);
    });
  });

  describe('update', () => {
    describe('native component', () => {
      it('updates text of a single text child', () => {
        var elementBefore = <div>Hi.</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        var elementAfter = <div>Bye.</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from no children to a single text child', () => {
        var elementBefore = <div />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div>Hi.</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a single text child to no children', () => {
        var elementBefore = <div>Hi.</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        var elementAfter = <div />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from html content to a single text child', () => {
        var elementBefore = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div>Hi.</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a single text child to html content', () => {
        var elementBefore = <div>Hi.</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        var elementAfter = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from no children to multiple text children', () => {
        var elementBefore = <div />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div>{'Hi.'}{'Bye.'}</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from multiple text children to no children', () => {
        var elementBefore = <div>{'Hi.'}{'Bye.'}</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        var elementAfter = <div />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from html content to multiple text children', () => {
        var elementBefore = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div>{'Hi.'}{'Bye.'}</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from multiple text children to html content', () => {
        var elementBefore = <div>{'Hi.'}{'Bye.'}</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        var elementAfter = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from html content to no children', () => {
        var elementBefore = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from no children to html content', () => {
        var elementBefore = <div />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div dangerouslySetInnerHTML={{__html: 'Hi.'}} />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from one text child to multiple text children', () => {
        var elementBefore = <div>Hi.</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };

        var elementAfter = <div>{'Hi.'}{'Bye.'}</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from multiple text children to one text child', () => {
        var elementBefore = <div>{'Hi.'}{'Bye.'}</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        var elementAfter = <div>Hi.</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }],
        };
        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates text nodes when reordering', () => {
        var elementBefore = <div>{'Hi.'}{'Bye.'}</div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Hi.',
          }, {
            displayName: '#text',
            text: 'Bye.',
          }],
        };

        var elementAfter = <div>{'Bye.'}{'Hi.'}</div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'Bye.',
          }, {
            displayName: '#text',
            text: 'Hi.',
          }],
        };
        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates native nodes when reordering with keys', () => {
        var elementBefore = (
          <div>
            <div key="a">Hi.</div>
            <div key="b">Bye.</div>
          </div>
        );
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Hi.',
            }],
          }, {
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Bye.',
            }],
          }],
        };

        var elementAfter = (
          <div>
            <div key="b">Bye.</div>
            <div key="a">Hi.</div>
          </div>
        );
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Bye.',
            }],
          }, {
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Hi.',
            }],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates native nodes when reordering without keys', () => {
        var elementBefore = (
          <div>
            <div>Hi.</div>
            <div>Bye.</div>
          </div>
        );
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Hi.',
            }],
          }, {
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Bye.',
            }],
          }],
        };

        var elementAfter = (
          <div>
            <div>Bye.</div>
            <div>Hi.</div>
          </div>
        );
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Bye.',
            }],
          }, {
            displayName: 'div',
            children: [{
              displayName: '#text',
              text: 'Hi.',
            }],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates a single composite child of a different type', () => {
        function Foo() {
          return null;
        }

        function Bar() {
          return null;
        }

        var elementBefore = <div><Foo /></div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [],
          }],
        };

        var elementAfter = <div><Bar /></div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates a single composite child of the same type', () => {
        function Foo({ children }) {
          return children;
        }

        var elementBefore = <div><Foo><div /></Foo></div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [{
              displayName: 'div',
              children: [],
            }],
          }],
        };

        var elementAfter = <div><Foo><span /></Foo></div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [{
              displayName: 'span',
              children: [],
            }],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from no children to a single composite child', () => {
        function Foo() {
          return null;
        }

        var elementBefore = <div />;
        var treeBefore = {
          displayName: 'div',
          children: [],
        };

        var elementAfter = <div><Foo /></div>;
        var treeAfter = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a single composite child to no children', () => {
        function Foo() {
          return null;
        }

        var elementBefore = <div><Foo /></div>;
        var treeBefore = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [],
          }],
        };

        var elementAfter = <div />;
        var treeAfter = {
          displayName: 'div',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates mixed children', () => {
        function Foo() {
          return <div />;
        }
        var element1 = (
          <div>
            {'hi'}
            {false}
            {42}
            {null}
            <Foo />
          </div>
        );
        var tree1 = {
          displayName: 'div',
          children: [{
            displayName: '#text',
            text: 'hi',
          }, {
            displayName: '#text',
            text: '42',
          }, {
            displayName: 'Foo',
            children: [{
              displayName: 'div',
              children: [],
            }],
          }],
        };

        var element2 = (
          <div>
            <Foo />
            {false}
            {'hi'}
            {null}
          </div>
        );
        var tree2 = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [{
              displayName: 'div',
              children: [],
            }],
          }, {
            displayName: '#text',
            text: 'hi',
          }],
        };

        var element3 = (
          <div>
            <Foo />
          </div>
        );
        var tree3 = {
          displayName: 'div',
          children: [{
            displayName: 'Foo',
            children: [{
              displayName: 'div',
              children: [],
            }],
          }],
        };

        assertTreeMatches([
          [element1, tree1],
          [element2, tree2],
          [element3, tree3],
        ]);
      });
    });

    describe('functional component', () => {
      it('updates with a native child', () => {
        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo><span /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'span',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from null to a native child', () => {
        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo>{null}</Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [],
        };

        var elementAfter = <Foo><div /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a native child to null', () => {
        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo>{null}</Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a native child to a composite child', () => {
        function Bar() {
          return null;
        }

        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo><Bar /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a composite child to a native child', () => {
        function Bar() {
          return null;
        }

        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo><Bar /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        var elementAfter = <Foo><div /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from null to a composite child', () => {
        function Bar() {
          return null;
        }

        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo>{null}</Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [],
        };

        var elementAfter = <Foo><Bar /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a composite child to null', () => {
        function Bar() {
          return null;
        }

        function Foo({ children }) {
          return children;
        }

        var elementBefore = <Foo><Bar /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        var elementAfter = <Foo>{null}</Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });
    });

    describe('class component', () => {
      it('updates with a native child', () => {
        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo><span /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'span',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from null to a native child', () => {
        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo>{null}</Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [],
        };

        var elementAfter = <Foo><div /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a native child to null', () => {
        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo>{null}</Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a native child to a composite child', () => {
        var Bar = React.createClass({
          render() {
            return null;
          },
        });

        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo><div /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        var elementAfter = <Foo><Bar /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a composite child to a native child', () => {
        var Bar = React.createClass({
          render() {
            return null;
          },
        });

        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo><Bar /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        var elementAfter = <Foo><div /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'div',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from null to a composite child', () => {
        var Bar = React.createClass({
          render() {
            return null;
          },
        });

        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo>{null}</Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [],
        };

        var elementAfter = <Foo><Bar /></Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });

      it('updates from a composite child to null', () => {
        var Bar = React.createClass({
          render() {
            return null;
          },
        });

        var Foo = React.createClass({
          render() {
            return this.props.children;
          },
        });

        var elementBefore = <Foo><Bar /></Foo>;
        var treeBefore = {
          displayName: 'Foo',
          children: [{
            displayName: 'Bar',
            children: [],
          }],
        };

        var elementAfter = <Foo>{null}</Foo>;
        var treeAfter = {
          displayName: 'Foo',
          children: [],
        };

        assertTreeMatches([
          [elementBefore, treeBefore],
          [elementAfter, treeAfter],
        ]);
      });
    });
  });

  it('tracks owner correctly', () => {
    class Foo extends React.Component {
      render() {
        return <Bar><h1>Hi.</h1></Bar>;
      }
    }
    function Bar({children}) {
      return <div>{children} Mom</div>;
    }

    // Note that owner is not calculated for text nodes
    // because they are not created from real elements.
    var element = <article><Foo /></article>;
    var tree = {
      displayName: 'article',
      children: [{
        displayName: 'Foo',
        children: [{
          displayName: 'Bar',
          ownerDisplayName: 'Foo',
          children: [{
            displayName: 'div',
            ownerDisplayName: 'Bar',
            children: [{
              displayName: 'h1',
              ownerDisplayName: 'Foo',
              children: [{
                displayName: '#text',
                text: 'Hi.',
              }],
            }, {
              displayName: '#text',
              text: ' Mom',
            }],
          }],
        }],
      }],
    };
    assertTreeMatches([element, tree], {includeOwnerDisplayName: true});
  });

  it('purges unmounted components automatically', () => {
    var node = document.createElement('div');
    var renderBar = true;
    var fooInstance;
    var barInstance;

    class Foo extends React.Component {
      render() {
        fooInstance = ReactInstanceMap.get(this);
        return renderBar ? <Bar /> : null;
      }
    }

    class Bar extends React.Component {
      render() {
        barInstance = ReactInstanceMap.get(this);
        return null;
      }
    }

    ReactDOM.render(<Foo />, node);
    expect(
      getTree(barInstance._debugID, {
        includeParentDisplayName: true,
        expectedParentID: fooInstance._debugID,
      })
    ).toEqual({
      displayName: 'Bar',
      parentDisplayName: 'Foo',
      children: [],
    });

    renderBar = false;
    ReactDOM.render(<Foo />, node);
    expect(
      getTree(barInstance._debugID, {expectedParentID: null})
    ).toEqual({
      displayName: 'Unknown',
      children: [],
    });

    ReactDOM.unmountComponentAtNode(node);
    expect(
      getTree(barInstance._debugID, {expectedParentID: null})
    ).toEqual({
      displayName: 'Unknown',
      children: [],
    });
  });

  it('reports update counts', () => {
    var node = document.createElement('div');

    ReactDOM.render(<div className="a" />, node);
    var divID = ReactComponentTreeDevtool.getRootIDs()[0];
    expect(ReactComponentTreeDevtool.getUpdateCount(divID)).toEqual(0);

    ReactDOM.render(<span className="a" />, node);
    var spanID = ReactComponentTreeDevtool.getRootIDs()[0];
    expect(ReactComponentTreeDevtool.getUpdateCount(divID)).toEqual(0);
    expect(ReactComponentTreeDevtool.getUpdateCount(spanID)).toEqual(0);

    ReactDOM.render(<span className="b" />, node);
    expect(ReactComponentTreeDevtool.getUpdateCount(divID)).toEqual(0);
    expect(ReactComponentTreeDevtool.getUpdateCount(spanID)).toEqual(1);

    ReactDOM.render(<span className="c" />, node);
    expect(ReactComponentTreeDevtool.getUpdateCount(divID)).toEqual(0);
    expect(ReactComponentTreeDevtool.getUpdateCount(spanID)).toEqual(2);

    ReactDOM.unmountComponentAtNode(node);
    expect(ReactComponentTreeDevtool.getUpdateCount(divID)).toEqual(0);
    expect(ReactComponentTreeDevtool.getUpdateCount(spanID)).toEqual(0);
  });

  it('does not report top-level wrapper as a root', () => {
    var node = document.createElement('div');

    ReactDOM.render(<div className="a" />, node);
    expect(getRootDisplayNames()).toEqual(['div']);

    ReactDOM.render(<div className="b" />, node);
    expect(getRootDisplayNames()).toEqual(['div']);

    ReactDOM.unmountComponentAtNode(node);
    expect(getRootDisplayNames()).toEqual([]);
    expect(getRegisteredDisplayNames()).toEqual([]);
  });
});
