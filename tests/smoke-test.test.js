/* @flow */

/*:: import typeof nodeFsType from 'fs'; */

const webpack = require("webpack");
const MemoryFS = require("memory-fs");
const path = require("path");
const nodeExternals = require("webpack-node-externals");
const I18nRuntimePlugin = require("../lib/index");

test("smoke test", async () => {
  await compile({
    plugin: new I18nRuntimePlugin({
      fullTranslations: {
        en: { hello_world: "Hello, world!", extra_key: "extra_key content" },
        fi: { hello_world: "Hei, maailma!", extra_key: "extra_key content" },
        sv: {
          hello_world: "Och samma på svenska",
          extra_key: "extra_key content"
        }
      },
      functionNames: ["I18n.t"],
      translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS"
    }),

    modules: {
      "file1.js": `module.exports = I18n.t("hello_world");`,
      "file2.js": `module.exports = I18n.t("hello_world", { locale: "fi" });`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;

      window.file1 = require("./file1");
      window.file2 = require("./file2");
    `
  });

  expect(window.file1).toEqual("Hello, world!");
  expect(window.file2).toEqual("Hei, maailma!");
  expect(window.I18n.translations.sv.hello_world).toEqual(
    "Och samma på svenska"
  );
  expect(Object.keys(window.I18n.translations.fi)).toEqual(["hello_world"]);
  expect(Object.keys(window.I18n.translations.en)).toEqual(["hello_world"]);
  expect(Object.keys(window.I18n.translations.sv)).toEqual(["hello_world"]);
});

async function compile({ entryCode, modules, plugin }) {
  const webpackConfig = {
    entry: {
      entry: "/input/ENTRY_POINT.js"
    },
    output: {
      path: "/output/"
    },
    plugins: [plugin],
    externals: [nodeExternals()],
    devtool: false,
    mode: "development"
  };

  const fs /*: nodeFsType */ = new MemoryFS();
  fs.mkdirSync("/input");
  for (const path of Object.keys(modules)) {
    fs.writeFileSync(`/input/${path}`, modules[path]);
  }
  fs.writeFileSync("/input/ENTRY_POINT.js", entryCode);

  const compiler = webpack(webpackConfig);
  compiler.inputFileSystem = fs;
  compiler.outputFileSystem = fs;

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return reject("webpack compilation failed");
      }

      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors.join("\n"));
        return reject("webpack compilation failed");
      }

      if (stats.hasWarnings()) {
        console.warn(info.warnings);
      }

      const code = fs.readFileSync("/output/entry.js", "utf8");
      eval(code);

      return resolve();
    });
  });
}
