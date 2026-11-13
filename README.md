# @venuu/i18n-js-webpack-plugin

A webpack companion plugin for [`i18n-js`](https://github.com/fnando/i18n-js/). Output only the translations your code is actually using to your bundle.

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `dependencies`:

```
npm install --save @venuu/i18n-js-webpack-plugin
```

This library has a `peerDependencies` listing for webpack 5. Use version 2 of the plugin with webpack 4.

## Usage

```javascript
// webpack.config.js

const { I18nRuntimePlugin } = require("@venuu/i18n-js-webpack-plugin");

module.exports = {
  // ...rest of your config
  plugins: [
    // ...any other plugins you might have
    I18nRuntimePlugin({
      fullTranslations: {
        // Put your entire translations here like below
        en: { hello: { world: "Hello, world!" } },
        fi: { hello: { world: "Hei, maailma!" } },
        sv: { hello: { world: "Och samma på svenska" } },
      },
      // Global calls for I18n translations that will be picked up
      functionNames: ["I18n.t", "I18n.translate"],
      // "Free variable" in your code that will be replaced with object containing all
      // used translations.
      translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS",
    }),
  ],
};
```

```javascript
// your-application-entry-point.js

// This assumes you have `I18n` from 'i18n-js' in current scope or available as a global
I18n.translations = I18N_RUNTIME_TRANSLATIONS;
```

Now, any of your imported modules can call `I18n.t` or `I18n.translate` and `I18N_RUNTIME_TRANSLATIONS` will be replaced with the used translations.

```javascript
I18n.t("hello.world");
I18n.t("hello.world", { locale: "sv" });
I18n.translate("hello.world");

console.log(I18n.t("hello", { locale: "sv" })); // outputs object: { world: 'Hello, world!' }
```

Only string literals, or expressions webpack can evaluate to a string, are picked up as keys. A call like `I18n.t(someVariable)` needs its translations included some other way.

## Persistent caching

The plugin works with webpack's [filesystem cache](https://webpack.js.org/configuration/cache/). The keys a module uses are stored with the module in the cache, so a build includes the translations of every module whether it was parsed or restored from the cache. The translations are written in place of the placeholder when the bundle's code is generated, so changes to `fullTranslations` show up without clearing the cache.

## LICENSE

MIT

<!-- prettier-ignore-start -->

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org

<!-- prettier-ignore-end -->
