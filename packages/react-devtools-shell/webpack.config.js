const {resolve} = require('path');
const {DefinePlugin} = require('webpack');
const {
  getGitHubURL,
  getVersionString,
} = require('react-devtools-extensions/utils');

const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
  console.error('NODE_ENV not set');
  process.exit(1);
}

const TARGET = process.env.TARGET;
if (!TARGET) {
  console.error('TARGET not set');
  process.exit(1);
}

const builtModulesDir = resolve(__dirname, '..', '..', 'build', 'node_modules');

const __DEV__ = NODE_ENV === 'development';

const GITHUB_URL = getGitHubURL();
const DEVTOOLS_VERSION = getVersionString();

const config = {
  mode: __DEV__ ? 'development' : 'production',
  devtool: false,
  entry: {
    app: './src/app/index.js',
    devtools: './src/devtools.js',
  },
  resolve: {
    alias: {
      react: resolve(builtModulesDir, 'react'),
      'react-dom': resolve(builtModulesDir, 'react-dom'),
      'react-debug-tools': resolve(builtModulesDir, 'react-debug-tools'),
      'react-is': resolve(builtModulesDir, 'react-is'),
      scheduler: resolve(builtModulesDir, 'scheduler'),
    },
  },
  plugins: [
    new DefinePlugin({
      __DEV__,
      __TEST__: false,
      'process.env.GITHUB_URL': `"${GITHUB_URL}"`,
      'process.env.DEVTOOLS_VERSION': `"${DEVTOOLS_VERSION}"`,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          configFile: resolve(
            __dirname,
            '..',
            'react-devtools-shared',
            'babel.config.js',
          ),
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              modules: true,
              localIdentName: '[local]___[hash:base64:5]',
            },
          },
        ],
      },
    ],
  },
};

if (TARGET === 'local') {
  config.devServer = {
    hot: true,
    port: 8080,
    clientLogLevel: 'warning',
    publicPath: '/dist/',
    stats: 'errors-only',
  };
} else {
  config.output = {
    path: resolve(__dirname, 'dist'),
    filename: '[name].js',
  };
}

module.exports = config;
