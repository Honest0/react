/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactComponentTreeHook
 */

'use strict';

var ReactCurrentOwner = require('ReactCurrentOwner');

var invariant = require('invariant');
var warning = require('warning');

var tree = {};
var unmountedIDs = {};
var rootIDs = {};

function updateTree(id, update) {
  if (!tree[id]) {
    tree[id] = {
      element: null,
      parentID: null,
      ownerID: null,
      text: null,
      childIDs: [],
      displayName: 'Unknown',
      isMounted: false,
      updateCount: 0,
    };
  }
  update(tree[id]);
}

function purgeDeep(id) {
  var item = tree[id];
  if (item) {
    var {childIDs} = item;
    delete tree[id];
    childIDs.forEach(purgeDeep);
  }
}

function describeComponentFrame(name, source, ownerName) {
  return '\n    in ' + name + (
    source ?
      ' (at ' + source.fileName.replace(/^.*[\\\/]/, '') + ':' +
      source.lineNumber + ')' :
    ownerName ?
      ' (created by ' + ownerName + ')' :
      ''
  );
}

function describeID(id) {
  var name = ReactComponentTreeHook.getDisplayName(id);
  var element = ReactComponentTreeHook.getElement(id);
  var ownerID = ReactComponentTreeHook.getOwnerID(id);
  var ownerName;
  if (ownerID) {
    ownerName = ReactComponentTreeHook.getDisplayName(ownerID);
  }
  warning(
    element,
    'ReactComponentTreeHook: Missing React element for debugID %s when ' +
    'building stack',
    id
  );
  return describeComponentFrame(name, element && element._source, ownerName);
}

var ReactComponentTreeHook = {
  onSetDisplayName(id, displayName) {
    updateTree(id, item => item.displayName = displayName);
  },

  onSetChildren(id, nextChildIDs) {
    updateTree(id, item => {
      item.childIDs = nextChildIDs;

      nextChildIDs.forEach(nextChildID => {
        var nextChild = tree[nextChildID];
        invariant(
          nextChild,
          'Expected hook events to fire for the child ' +
          'before its parent includes it in onSetChildren().'
        );
        invariant(
          nextChild.displayName != null,
          'Expected onSetDisplayName() to fire for the child ' +
          'before its parent includes it in onSetChildren().'
        );
        invariant(
          nextChild.childIDs != null || nextChild.text != null,
          'Expected onSetChildren() or onSetText() to fire for the child ' +
          'before its parent includes it in onSetChildren().'
        );
        invariant(
          nextChild.isMounted,
          'Expected onMountComponent() to fire for the child ' +
          'before its parent includes it in onSetChildren().'
        );
        if (nextChild.parentID == null) {
          nextChild.parentID = id;
          // TODO: This shouldn't be necessary but mounting a new root during in
          // componentWillMount currently causes not-yet-mounted components to
          // be purged from our tree data so their parent ID is missing.
        }
        invariant(
          nextChild.parentID === id,
          'Expected onSetParent() and onSetChildren() to be consistent (%s ' +
          'has parents %s and %s).',
          nextChildID,
          nextChild.parentID,
          id
        );
      });
    });
  },

  onSetOwner(id, ownerID) {
    updateTree(id, item => item.ownerID = ownerID);
  },

  onSetParent(id, parentID) {
    updateTree(id, item => item.parentID = parentID);
  },

  onSetText(id, text) {
    updateTree(id, item => item.text = text);
  },

  onBeforeMountComponent(id, element) {
    updateTree(id, item => item.element = element);
  },

  onBeforeUpdateComponent(id, element) {
    updateTree(id, item => item.element = element);
  },

  onMountComponent(id) {
    updateTree(id, item => item.isMounted = true);
  },

  onMountRootComponent(id) {
    rootIDs[id] = true;
  },

  onUpdateComponent(id) {
    updateTree(id, item => item.updateCount++);
  },

  onUnmountComponent(id) {
    updateTree(id, item => item.isMounted = false);
    unmountedIDs[id] = true;
    delete rootIDs[id];
  },

  purgeUnmountedComponents() {
    if (ReactComponentTreeHook._preventPurging) {
      // Should only be used for testing.
      return;
    }

    for (var id in unmountedIDs) {
      purgeDeep(id);
    }
    unmountedIDs = {};
  },

  isMounted(id) {
    var item = tree[id];
    return item ? item.isMounted : false;
  },

  getCurrentStackAddendum(topElement) {
    var info = '';
    if (topElement) {
      var type = topElement.type;
      var name = typeof type === 'function' ?
        type.displayName || type.name :
        type;
      var owner = topElement._owner;
      info += describeComponentFrame(
        name || 'Unknown',
        topElement._source,
        owner && owner.getName()
      );
    }

    var currentOwner = ReactCurrentOwner.current;
    var id = currentOwner && currentOwner._debugID;

    info += ReactComponentTreeHook.getStackAddendumByID(id);
    return info;
  },

  getStackAddendumByID(id) {
    var info = '';
    while (id) {
      info += describeID(id);
      id = ReactComponentTreeHook.getParentID(id);
    }
    return info;
  },

  getChildIDs(id) {
    var item = tree[id];
    return item ? item.childIDs : [];
  },

  getDisplayName(id) {
    var item = tree[id];
    return item ? item.displayName : 'Unknown';
  },

  getElement(id) {
    var item = tree[id];
    return item ? item.element : null;
  },

  getOwnerID(id) {
    var item = tree[id];
    return item ? item.ownerID : null;
  },

  getParentID(id) {
    var item = tree[id];
    return item ? item.parentID : null;
  },

  getSource(id) {
    var item = tree[id];
    var element = item ? item.element : null;
    var source = element != null ? element._source : null;
    return source;
  },

  getText(id) {
    var item = tree[id];
    return item ? item.text : null;
  },

  getUpdateCount(id) {
    var item = tree[id];
    return item ? item.updateCount : 0;
  },

  getRootIDs() {
    return Object.keys(rootIDs);
  },

  getRegisteredIDs() {
    return Object.keys(tree);
  },
};

module.exports = ReactComponentTreeHook;
