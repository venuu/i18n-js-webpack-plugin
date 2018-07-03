/* @flow */

const path = require("path");
const nodeExternals = require("webpack-node-externals");
const I18nRuntimePlugin = require("../lib/index");

module.exports = {
  entry: {
    mainCjs: path.join(__dirname, "app", "main-commonjs.js")
  },
  output: {
    path: path.join(__dirname, "build")
  },
  plugins: [
    new I18nRuntimePlugin({
      fullTranslations: {
        en: { hello_world: "Hello, world!" },
        fi: { hello_world: "Hei, maailma!" },
        sv: { hello_world: "Och samma på svenska" }
      },
      functionNames: ["I18n.t"],
      translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS"
    })
  ],
  devtool: false,
  externals: [nodeExternals()],
  mode: "development"
};
