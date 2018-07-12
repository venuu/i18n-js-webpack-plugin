/* @flow */
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const NullFactory = require("webpack/lib/NullFactory");
const Bacon = require("baconjs");

/*::
type Options = {|
  translationPlaceholderConstantName: string
|};
type Compiler = {
  hooks: {
    compilation: { tap: (moduleName: string, listener: Function) => void }
  }
};
*/

module.exports = function makeTranslationPlaceholderScanner(
  { translationPlaceholderConstantName } /*: Options */
) {
  const extractDependenciesWithParser = placeholderDependencies(
    translationPlaceholderConstantName
  );

  return function translationPlaceholderScanner(compiler /*: Compiler */) {
    return Bacon.fromBinder(sink => {
      // Hook into the parser for each compilation in the compiler
      compiler.hooks.compilation.tap(
        "@venuu/i18n-js-webpack-plugin",
        (compilation, params) => {
          // We are going to be adding ConstDependency instances so here's some boilerplate
          compilation.dependencyFactories.set(
            ConstDependency,
            new NullFactory()
          );
          compilation.dependencyTemplates.set(
            ConstDependency,
            new ConstDependency.Template()
          );

          const parser = params.normalModuleFactory.hooks.parser;
          parser
            .for("javascript/auto")
            .tap("@venuu/i18n-js-webpack-plugin", parser => sink(parser));
        }
      );
    }).flatMap(extractDependenciesWithParser);
  };
};

function placeholderDependencies(translationPlaceholderConstantName) {
  return parser =>
    Bacon.fromBinder(sink => {
      // Scan for constant expressions with the placeholder name
      parser.hooks.expression.tap(
        translationPlaceholderConstantName,
        "@venuu/i18n-js-webpack-plugin",
        function(expr) {
          // Create a ConstDependency that we can use to fill in the placeholder
          const replacementDependency = new ConstDependency(null, expr.range);
          replacementDependency.loc = expr.loc;
          parser.state.current.addDependency(replacementDependency);
          sink(replacementDependency);
          // No idea if the return needs to be here
          return true;
        }
      );
    });
}
