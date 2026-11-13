import type { Compiler, javascript } from "webpack";
import { pickUsedTranslations } from "./minimize-translations";
import {
  TranslationsPlaceholderDependency,
  TranslationsPlaceholderDependencyTemplate,
  setTranslationsJson,
} from "./translations-placeholder-dependency";

export type Translation =
  | string
  | number
  | boolean
  | null
  | Array<Translation>
  | { [key: string]: Translation };
export type Translations = { [locale: string]: { [key: string]: Translation } };

export type I18nRuntimePluginOptions = {
  /** Every translation of every locale, keyed by locale. */
  fullTranslations: Translations;
  /** Calls whose first argument is a translation keypath, such as `I18n.t`. */
  functionNames: Array<string>;
  /** The free variable replaced with the translations the code uses. */
  translationPlaceholderConstantName: string;
};

type JavascriptParser = javascript.JavascriptParser;
type Expression = Parameters<JavascriptParser["evaluateExpression"]>[0];
type Location = TranslationsPlaceholderDependency["loc"];

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
 * Replaces `translationPlaceholderConstantName` with the translations of the
 * keypaths passed to `functionNames` anywhere in the bundle.
 */
export function I18nRuntimePlugin(
  options: I18nRuntimePluginOptions,
): I18nRuntimeWebpackPlugin {
  return new I18nRuntimeWebpackPlugin(options);
}

class I18nRuntimeWebpackPlugin {
  private readonly options: I18nRuntimePluginOptions;

  constructor(options: I18nRuntimePluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyTemplates.set(
          TranslationsPlaceholderDependency,
          new TranslationsPlaceholderDependencyTemplate(),
        );

        for (const type of JAVASCRIPT_MODULE_TYPES) {
          normalModuleFactory.hooks.parser
            .for(type)
            // Parsers of JavaScript module types are JavascriptParsers.
            .tap(PLUGIN_NAME, (parser) =>
              this.scanModule(parser as unknown as JavascriptParser),
            );
        }

        compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
          const keypaths: Array<string> = [];
          for (const module of modules) {
            const moduleKeypaths: Array<string> | undefined =
              module.buildInfo?.[BUILD_INFO_KEYPATHS];
            if (moduleKeypaths) {
              keypaths.push(...moduleKeypaths);
            }
          }

          setTranslationsJson(
            compilation,
            JSON.stringify(
              pickUsedTranslations(this.options.fullTranslations, keypaths),
            ),
          );
        });
      },
    );
  }

  private scanModule(parser: JavascriptParser): void {
    for (const functionName of this.options.functionNames) {
      parser.hooks.call.for(functionName).tap(PLUGIN_NAME, (expression) => {
        if (expression.type !== "CallExpression") {
          return;
        }
        const [firstArgument] = expression.arguments;
        if (!firstArgument || firstArgument.type === "SpreadElement") {
          return;
        }
        const keypath = parser.evaluateExpression(firstArgument);
        if (!keypath.isString() || keypath.string === undefined) {
          return;
        }

        const { buildInfo } = parser.state.module;
        if (!buildInfo) {
          return;
        }
        buildInfo[BUILD_INFO_KEYPATHS] = buildInfo[BUILD_INFO_KEYPATHS] || [];
        buildInfo[BUILD_INFO_KEYPATHS].push(keypath.string);
      });
    }

    parser.hooks.expression
      .for(this.options.translationPlaceholderConstantName)
      .tap(PLUGIN_NAME, (expression) => {
        if (!expression.range) {
          return;
        }
        const dependency = new TranslationsPlaceholderDependency(
          expression.range,
        );
        dependency.loc = locationOf(parser, expression);
        parser.state.module.addPresentationalDependency(dependency);
        return true;
      });
  }
}

// Newer webpack versions compute locations only when asked for them, and
// older ones keep them on the expression.
function locationOf(
  parser: JavascriptParser,
  expression: Expression,
): Location {
  const { getLocation } = parser as {
    getLocation?: (node: Expression) => Location;
  };
  return getLocation
    ? getLocation.call(parser, expression)
    : (expression.loc as Location);
}
