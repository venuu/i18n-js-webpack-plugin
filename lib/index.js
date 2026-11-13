const TranslationsPlaceholderDependency = require("./translations-placeholder-dependency");
const pickUsedTranslations = require("./minimize-translations");

const PLUGIN_NAME = "@venuu/i18n-js-webpack-plugin";
const JAVASCRIPT_MODULE_TYPES = [
  "javascript/auto",
  "javascript/dynamic",
  "javascript/esm",
];
// `buildInfo` is stored with the module in webpack's persistent cache, so the
// keypaths of a module restored from the cache are there without parsing it.
const BUILD_INFO_KEYPATHS = "venuuI18nJsKeypaths";

/**
 * @param {{
 *   fullTranslations: Record<string, Record<string, unknown>>,
 *   functionNames: Array<string>,
 *   translationPlaceholderConstantName: string
 * }} options
 */
function I18nRuntimePlugin(options) {
  return new I18nRuntimeWebpackPlugin(options);
}

class I18nRuntimeWebpackPlugin {
  constructor({
    fullTranslations,
    functionNames,
    translationPlaceholderConstantName,
  }) {
    this.fullTranslations = fullTranslations;
    this.functionNames = functionNames;
    this.translationPlaceholderConstantName =
      translationPlaceholderConstantName;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyTemplates.set(
          TranslationsPlaceholderDependency,
          new TranslationsPlaceholderDependency.Template(),
        );

        for (const type of JAVASCRIPT_MODULE_TYPES) {
          normalModuleFactory.hooks.parser
            .for(type)
            .tap(PLUGIN_NAME, (parser) => this.scanModule(parser));
        }

        compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
          const keypaths = [];
          for (const module of modules) {
            const moduleKeypaths =
              module.buildInfo && module.buildInfo[BUILD_INFO_KEYPATHS];
            if (moduleKeypaths) {
              keypaths.push(...moduleKeypaths);
            }
          }

          TranslationsPlaceholderDependency.setTranslationsJson(
            compilation,
            JSON.stringify(
              pickUsedTranslations(this.fullTranslations, keypaths),
            ),
          );
        });
      },
    );
  }

  scanModule(parser) {
    for (const functionName of this.functionNames) {
      parser.hooks.call.for(functionName).tap(PLUGIN_NAME, (expression) => {
        if (expression.arguments.length < 1) {
          return;
        }
        const keypath = parser.evaluateExpression(expression.arguments[0]);
        if (!keypath.isString()) {
          return;
        }

        const { buildInfo } = parser.state.module;
        buildInfo[BUILD_INFO_KEYPATHS] = buildInfo[BUILD_INFO_KEYPATHS] || [];
        buildInfo[BUILD_INFO_KEYPATHS].push(keypath.string);
      });
    }

    parser.hooks.expression
      .for(this.translationPlaceholderConstantName)
      .tap(PLUGIN_NAME, (expression) => {
        const dependency = new TranslationsPlaceholderDependency(
          expression.range,
        );
        // Newer webpack versions compute locations only when asked for them.
        dependency.loc = parser.getLocation
          ? parser.getLocation(expression)
          : expression.loc;
        parser.state.module.addPresentationalDependency(dependency);
        return true;
      });
  }
}

module.exports = I18nRuntimePlugin;
