/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactComponentTreeDevtool
 */

'use strict';

var unmountedContainerIDs = [];
var allChildIDsByContainerID = {};
var tree = {};

function updateTree(id, update) {
  if (!tree[id]) {
    tree[id] = {};
  }
  update(tree[id]);
}

function purgeTree(id) {
  var item = tree[id];
  if (!item) {
    return;
  }

  var {childIDs, containerID} = item;
  delete tree[id];

  if (containerID) {
    allChildIDsByContainerID[containerID] = allChildIDsByContainerID[containerID]
      .filter(childID => childID !== id);
  }

  if (childIDs) {
    childIDs.forEach(purgeTree);
  }
}

var ReactComponentTreeDevtool = {
  onSetIsComposite(id, isComposite) {
    updateTree(id, item => item.isComposite = isComposite);
  },

  onSetDisplayName(id, displayName) {
    updateTree(id, item => item.displayName = displayName);
  },

  onSetChildren(id, childIDs) {
    childIDs.forEach(childID => {
      var childItem = tree[childID];
      expect(childItem).toBeDefined();
      expect(childItem.isComposite).toBeDefined();
      expect(childItem.displayName).toBeDefined();
      expect(childItem.childIDs || childItem.text).toBeDefined();
    });

    updateTree(id, item => item.childIDs = childIDs);
  },

  onSetOwner(id, ownerDebugID) {
    updateTree(id, item => item.ownerDebugID = ownerDebugID);
  },

  onSetText(id, text) {
    updateTree(id, item => item.text = text);
  },

  onMountComponent(id, containerID) {
    if (!allChildIDsByContainerID[containerID]) {
      allChildIDsByContainerID[containerID] = [];
    }
    allChildIDsByContainerID[containerID].push(id);
    updateTree(id, item => item.containerID = containerID);
  },

  onUnmountComponent(id) {
    purgeTree(id);
  },

  onUnmountNativeContainer(containerID) {
    unmountedContainerIDs.push(containerID);
  },

  purgeUnmountedContainers() {
    unmountedContainerIDs.forEach(containerID => {
      allChildIDsByContainerID[containerID].forEach(purgeTree);
    });
    unmountedContainerIDs = [];
  },

  getTree() {
    return Object.keys(tree).reduce((result, key) => {
      result[key] = {...tree[key]};
      return result;
    }, {});
  },
};

module.exports = ReactComponentTreeDevtool;
