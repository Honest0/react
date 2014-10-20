---
id: references-to-components
title: References to Components
layout: tips
permalink: references-to-components.html
prev: expose-component-functions.html
next: children-undefined.html
---

If you're using React components in a larger non-React application or transitioning your code to React, you may need to keep references to components. `React.renderComponent` returns a reference to the mounted component:

```js
var myComponent = React.renderComponent(<MyComponent />, myContainer);
```

Keep in mind, however, that the "constructor" of a component doesn't return a component instance! It's just a **descriptor**: a lightweight representation that tells React what the mounted component should look like.

```js
var myComponent = <MyComponent />; // This is just a descriptor.

// Some code here...

myComponent = React.renderComponent(myComponent, myContainer);
```

> Note:
>
> This should only ever be used at the top level. Inside components, let your `props` and `state` handle communication with child components, and only reference components via [refs](http://facebook.github.io/react/docs/more-about-refs.html).
