# Tooling integration

Every project uses a different system for building and deploying JavaScript. We've tried to make React as environment-agnostic as possible.

## CDN-hosted React

We provide CDN-hosted versions of React [on our download page](/react/downloads.html). These prebuilt files use the UMD module format. Dropping them in with a simple `<script>` tag will inject a `React` global into your environment. It also works out-of-the-box in CommonJS and AMD environments.

## Using master

We have instructions for building from master [in our GitHub repository](https://github.com/facebook/react). We build a tree of CommonJS modules under `build/modules` which you can drop into any environment or packaging tool that supports CommonJS.

## In-browser JSX transform

If you like using JSX, we provide an in-browser JSX transformer for development [on our download page](/react/downloads.html). Simply include a `<script type="text/jsx">` tag to engage the JSX transformer. Be sure to include the `/** @jsx React.DOM */` comment as well, otherwise the transformer will not run the transforms.

**Warning:** the in-browser JSX transformer is fairly large and is extra computation. Do not use it in production -- see the next section.

## Productionizing: precompiled JSX

If you have [npm](http://npmjs.org/), you can simply run `npm install -g react-tools` to install our command-line `jsx` tool. This tool will translate files that use JSX syntax to plain JavaScript files that can run directly in the browser. It will also watch directories for you and automatically transform files when they are changed; for example: `jsx --watch src/ build/`. Run `jsx --help` for more information on how to use this tool.

## Helpful open-source projects

The open-source community has built tools that integrate JSX with several build systems.

* [reactify](https://github.com/andreypopp/reactify) - use JSX with [browserify](http://browserify.org/).
* [grunt-react](https://github.com/ericclemmons/grunt-react) - [grunt](http://gruntjs.com/) task for JSX
* [require-jsx](https://github.com/seiffert/require-jsx) - use JSX with [require.js](http://requirejs.org/)
* [reactapp](https://github.com/jordwalke/reactapp) - a sample project to get up-and-running with React quickly
