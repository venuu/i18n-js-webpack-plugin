// @flow

/*:: import typeof nodeFsType from 'fs'; */

const webpack = require("webpack");
const MemoryFS = require("memory-fs");
const path = require("path");
const nodeExternals = require("webpack-node-externals");

/*::
type CompileArgs = {|
  entryCode: string,
  modules: { [path: string]: string },
  plugin: any
|};
*/

exports.compile = async function compile(
  { entryCode, modules, plugin } /*: CompileArgs */
) {
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
        return reject(info.errors.join("\n"));
      }

      if (stats.hasWarnings()) {
        console.warn(info.warnings);
      }

      const code = fs.readFileSync("/output/entry.js", "utf8");
      eval(code);

      return resolve();
    });
  });
};
