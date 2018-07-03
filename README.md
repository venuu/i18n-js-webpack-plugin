# @venuu/i18n-js-webpack-plugin

A webpack companion plugin for [`i18n-js`](https://github.com/fnando/i18n-js/). Output only the translations your code is actually using to your bundle.

<hr />

[![Build Status][build-badge]][build]

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `dependencies`:

```
npm install --save @venuu/i18n-js-webpack-plugin
```

This library has a `peerDependencies` listing for webpack 4.

## Usage

```javascript
// webpack.config.js

const { I18nRuntimePlugin } = require("@venuu/i18n-js-webpack-plugin");

module.exports = {
  // ...rest of your config
  plugins: [
    // ...any other plugins you might have
    new I18nRuntimePlugin({
      fullTranslations: {
        // Put your entire translations here like below
        en: { hello: { world: "Hello, world!" } },
        fi: { hello: { world: "Hei, maailma!" } },
        sv: { hello: { world: "Och samma på svenska" } }
      },
      // Global calls for I18n translations that will be picked up
      functionNames: ["I18n.t", "I18n.translate"],
      // "Free variable" in your code that will be replaced with object containing all
      // used translations.
      translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS"
    })
  ]
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

## LICENSE

MIT

<!-- prettier-ignore-start -->

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://travis-ci.org/venuu/@venuu/i18n-js-webpack-plugin.svg?branch=master
[build]: https://travis-ci.org/venuu/@venuu/i18n-js-webpack-plugin

<!-- prettier-ignore-end -->
