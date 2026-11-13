const fs = require("fs");
const os = require("os");
const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");

// A directory of source files that can be built more than once, sharing one
// webpack filesystem cache between the builds.
exports.makeProject = function makeProject() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "i18n-js-webpack-plugin-"),
  );
  const inputDir = path.join(root, "input");
  fs.mkdirSync(inputDir);

  return {
    writeModules(modules) {
      for (const [file, code] of Object.entries(modules)) {
        fs.writeFileSync(path.join(inputDir, file), code);
      }
    },

    // Builds the entry point and evaluates the bundle. Returns the webpack
    // stats of the build.
    build({ plugin, cache = false }) {
      return runWebpack({
        entry: path.join(inputDir, "ENTRY_POINT.js"),
        context: root,
        output: { path: path.join(root, "output") },
        plugins: [plugin],
        externals: [nodeExternals()],
        devtool: false,
        mode: "development",
        cache: cache
          ? { type: "filesystem", cacheDirectory: path.join(root, "cache") }
          : false,
        // Content hashes notice changes that happen within the timestamp
        // accuracy of the file system, as they do between test builds.
        snapshot: {
          module: { hash: true },
          resolve: { hash: true },
        },
      }).then((stats) => {
        const code = fs.readFileSync(
          path.join(root, "output", "main.js"),
          "utf8",
        );
        eval(code);
        return stats;
      });
    },

    remove() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
};

exports.compile = async function compile({ entryCode, modules, plugin }) {
  const project = exports.makeProject();
  try {
    project.writeModules({ ...modules, "ENTRY_POINT.js": entryCode });
    await project.build({ plugin });
  } finally {
    project.remove();
  }
};

function runWebpack(config) {
  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      // Closing the compiler writes the filesystem cache.
      compiler.close((closeErr) => {
        if (err || closeErr) {
          return reject(err || closeErr);
        }
        if (stats.hasErrors()) {
          return reject(
            new Error(
              stats
                .toJson({ errors: true })
                .errors.map((error) => error.message)
                .join("\n"),
            ),
          );
        }
        resolve(stats);
      });
    });
  });
}
