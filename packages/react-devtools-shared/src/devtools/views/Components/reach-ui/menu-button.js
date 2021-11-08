/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  Menu,
  MenuList as ReachMenuList,
  MenuButton,
  MenuItem,
} from '@reach/menu-button';
import useThemeStyles from '../../useThemeStyles';

const MenuList = ({children, ...props}: {children: React$Node, ...}) => {
  const style = useThemeStyles();
  return (
    <ReachMenuList style={style} {...props}>
      {children}
    </ReachMenuList>
  );
};

export {MenuItem, MenuButton, MenuList, Menu};
