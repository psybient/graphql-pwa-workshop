'use strict';

const isDebug = process.env.NODE_ENV === 'development';

// Hook for statics files such as images or css files
const cssModulesHook = require('css-modules-require-hook');
cssModulesHook({
  extensions: ['.css'],
  camelCase: 'dashes',
  generateScopedName: isDebug
    ? '[name]-[local]-[hash:base64:5]'
    : '[hash:base64:5]'
});

// React Universal tools and components
const React = require('react');
const createElement = React.createElement;
const ReactDOM = require('react-dom/server');
const renderToString = ReactDOM.renderToString;
const { Provider } = require('react-redux');
const { StaticRouter } = require('react-router');

// Material-UI SSR Setup
const { SheetsRegistry } = require('react-jss/lib/jss');
const { JssProvider } = require('react-jss');
const { MuiThemeProvider, createMuiTheme, createGenerateClassName } = require('material-ui/styles');
const { green, red } = require('material-ui/colors');

const configureStore = require('../../../client/store/configureStore').default;
const App = require('../../../client/components/App').default;
const Html = require('../../../client/components/Html').default;
const clientConfig = require('../../../client/config').default;

// Assets file generated by webpack
const assets = require('../../../build/assets.json');

// Render React UI from the server
const serverSideRender = (req, res, next) => {
  try {
    const store = configureStore({});
    const context = { store };

    let status = 200;
    if (context.url) {
      status = 302;
      req.originalUrl = context.url;
    }
    if (context.status === '404') {
      status = 404;
    }

    // MUI Server Side
    // Create a sheetsRegistry instance.
    const sheetsRegistry = new SheetsRegistry();

    // Create a theme instance.
    const theme = createMuiTheme({
      palette: {
        primary: green,
        accent: red,
        type: 'light'
      }
    });

    const generateClassName = createGenerateClassName();

    const app = renderToString(
      createElement(
        Provider,
        { store },
        createElement(
          StaticRouter,
          { location: req.originalUrl, context },
          createElement(
            JssProvider,
            { registry: sheetsRegistry, generateClassName },
            createElement(
              MuiThemeProvider,
              { theme, sheetsManager: new Map() },
              createElement(App, {})
            )
          )
        )
      )
    );

    // Grab the CSS from our sheetsRegistry.
    const jss = sheetsRegistry.toString();

    // Send the rendered page back to the client.
    res.status(status);
    res.send(`<!doctype html>${ReactDOM.renderToStaticMarkup(
      createElement(Html, {
        title: clientConfig.app.title,
        description: clientConfig.app.description,
        favicon: '',
        styles: [assets.client.css],
        scripts: [assets.vendor.js, assets.client.js],
        state: store.getState(),
        jss: jss,
        children: app
      })
    )}`);
  } catch (err) {
    next(err);
  }
};

module.exports = serverSideRender;
