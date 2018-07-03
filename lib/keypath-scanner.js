/* @flow */
const Bacon = require("baconjs");

/*::
type Options = {|
  functionNames: Array<string>
|}
type Compiler = {
  plugin: (event: string, listener: Function) => void
}
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
      compiler.plugin("compilation", (_compilation, params) => {
        params.normalModuleFactory.plugin("parser", parser => sink(parser));
      });
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
      parser.plugin(`call ${functionName}`, functionCallExpression =>
        sink(functionCallExpression)
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
