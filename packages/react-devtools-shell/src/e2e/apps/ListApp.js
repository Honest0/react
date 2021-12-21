/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useRef, useState} from 'react';

export default function App() {
  return <List />;
}

function List() {
  const [items, setItems] = useState(['one', 'two', 'three']);
  const inputRef = useRef(null);

  const addItem = () => {
    const input = ((inputRef.current: any): HTMLInputElement);
    const text = input.value;
    input.value = '';

    if (text) {
      setItems([...items, text]);
    }
  };

  return (
    <>
      <input ref={inputRef} data-testname="AddItemInput" />
      <button data-testname="AddItemButton" onClick={addItem}>
        Add Item
      </button>
      <ul data-testname="List">
        {items.map((label, index) => (
          <ListItem key={index} label={label} />
        ))}
      </ul>
    </>
  );
}

function ListItem({label}) {
  return <li data-testname="ListItem">{label}</li>;
}
