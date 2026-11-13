import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import webpack from "webpack";
import type { Configuration, Stats, WebpackPluginInstance } from "webpack";
import nodeExternals from "webpack-node-externals";

// The bundles' externals, such as i18n-js, resolve from this repository.
const requireFromRepository = createRequire(
  path.join(process.cwd(), "package.json"),
);

export type Project = {
  writeModules(modules: Record<string, string>): void;
  // Builds the entry point and evaluates the bundle.
  build(options: {
    plugin: WebpackPluginInstance;
    cache?: boolean;
  }): Promise<Stats>;
  remove(): void;
};

// A directory of source files that can be built more than once, sharing one
// webpack filesystem cache between the builds.
export function makeProject(): Project {
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

    async build({ plugin, cache = false }) {
      const stats = await runWebpack({
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
      });
      const code = fs.readFileSync(
        path.join(root, "output", "main.js"),
        "utf8",
      );
      new Function("require", code)(requireFromRepository);
      return stats;
    },

    remove() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

export async function compile({
  entryCode,
  modules,
  plugin,
}: {
  entryCode: string;
  modules: Record<string, string>;
  plugin: WebpackPluginInstance;
}): Promise<void> {
  const project = makeProject();
  try {
    project.writeModules({ ...modules, "ENTRY_POINT.js": entryCode });
    await project.build({ plugin });
  } finally {
    project.remove();
  }
}

function runWebpack(config: Configuration): Promise<Stats> {
  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      // Closing the compiler writes the filesystem cache.
      compiler.close((closeErr) => {
        if (err || closeErr || !stats) {
          return reject(err ?? closeErr ?? new Error("webpack gave no stats"));
        }
        if (stats.hasErrors()) {
          const { errors = [] } = stats.toJson({ errors: true });
          return reject(
            new Error(errors.map((error) => error.message).join("\n")),
          );
        }
        resolve(stats);
      });
    });
  });
}
