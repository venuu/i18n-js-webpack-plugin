/* @flow */
const Bacon = require("baconjs");

/*::
type Options = {|
  functionNames: Array<string>
|}
type Compiler = {
  hooks: {
    compilation: { tap: (moduleName: string, listener: Function) => void }
  }
};
*/

module.exports = function makeUsedTranslationKeypathScanner(
  { functionNames } /*: Options */
) {
  const extractKeypathsWithParser = collectUsedTranslationKeypaths(
    functionNames
  );

  return function usedTranslationKeypathScanner(compiler /*: Compiler */) {
    return Bacon.fromBinder(sink => {
      // Hook into the parser for each compilation in the compiler
      compiler.hooks.compilation.tap(
        "@venuu/i18n-js-webpack-plugin",
        (_compilation, params) => {
          params.normalModuleFactory.hooks.parser
            .for("javascript/auto")
            .tap("@venuu/i18n-js-webpack-plugin", parser => sink(parser));
        }
      );
    }).flatMap(extractKeypathsWithParser);
  };
};

function collectUsedTranslationKeypaths(functionNames) {
  return parser =>
    Bacon.fromArray(functionNames)
      // Extract calls to the named functions
      .flatMap(functionCallExpressionsByName(parser))
      // Extract values of first arguments when they are strings
      .flatMap(firstFunctionArgument)
      .flatMap(stringExpressionValues(parser));
}

function functionCallExpressionsByName(parser) {
  return functionName =>
    Bacon.fromBinder(sink => {
      parser.hooks.call.tap(
        functionName,
        "@venuu/i18n-js-webpack-plugin",
        functionCallExpression => sink(functionCallExpression)
      );
    });
}

function firstFunctionArgument(functionExpression) {
  if (functionExpression.arguments.length < 1) {
    return Bacon.never();
  }
  return Bacon.once(functionExpression.arguments[0]);
}

function stringExpressionValues(parser) {
  return argumentExpression => {
    const evaluated = parser.evaluateExpression(argumentExpression);

    if (!evaluated.isString()) {
      return Bacon.never();
    }

    return Bacon.once(evaluated.string);
  };
}
