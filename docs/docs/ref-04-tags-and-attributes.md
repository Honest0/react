---
id: tags-and-attributes
title: Tags and Attributes
layout: docs
permalink: tags-and-attributes.html
prev: component-specs.html
next: events.html
---

## Supported Tags

React attempts to support all common elements. If you need an element that isn't listed here, please file an issue.

The following elements are supported:


### HTML Elements

```
a abbr address area article aside audio b base bdi bdo big blockquote body br
button canvas caption cite code col colgroup data datalist dd del details dfn
div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6
head header hr html i iframe img input ins kbd keygen label legend li link
main map mark menu menuitem meta meter nav noscript object ol optgroup option
output p param pre progress q rp rt ruby s samp script section select small
source span strong style sub summary sup table tbody td textarea tfoot th
thead time title tr track u ul var video wbr
```

### SVG elements

```
circle g line path polyline rect svg text
```


## Supported Attributes

React supports all `data-*` and `aria-*` attributes as well as every attribute
in the following lists. Note that all attributes are camel-cased and the attributes `class` and `for` are `className` and `htmlFor`, respectively, to match the DOM API specification.

For a list of events, see [Supported Events](events.html).

### HTML Attributes

```
accessKey accept action ajaxify allowFullScreen allowTransparency alt
autoComplete autoFocus autoPlay cellPadding cellSpacing charSet checked
className colSpan content contentEditable contextMenu controls data dateTime
dir disabled draggable encType form frameBorder height hidden href htmlFor
httpEquiv icon id label lang list max maxLength method min multiple name
pattern poster preload placeholder radioGroup rel readOnly required role
rowSpan scrollLeft scrollTop selected size spellCheck src step style tabIndex
target title type value width wmode
```

In addition, the non-standard `autoCapitalize` attribute is supported for Mobile Safari.

### SVG Attributes

```
cx cy d fill fx fy points r stroke strokeLinecap strokeWidth transform x x1 x2
version viewBox y y1 y2 spreadMethod offset stopColor stopOpacity
gradientUnits gradientTransform
```
