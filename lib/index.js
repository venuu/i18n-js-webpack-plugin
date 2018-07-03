/* @flow weak */
const Bacon = require("baconjs");

const makeTranslationPlaceholderScanner = require("./placeholder-scanner");
const makeUsedTranslationKeypathScanner = require("./keypath-scanner");
const makeTranslationGraphMinimizer = require("./minimize-translations");
const replacePlaceholders = require("./replace-placeholders");

/*::
type Translation = string | { [key: string]: Translation };
type Translations = { [locale: string]: { [key: string]: Translation } }
type Options = {|
  functionNames: Array<string>,
  translationPlaceholderConstantName: string,
  fullTranslations: Translations
|};

type Compiler = {
  plugin: (event: string, listener: Function) => void
}
type Compilation = {
  plugin: (event: string, listener: Function) => void
}
*/

function I18nRuntimePlugin(opts /*: Options */) {
  const functionNames = opts.functionNames;
  const translationPlaceholderConstantName =
    opts.translationPlaceholderConstantName;
  const fullTranslations = opts.fullTranslations;

  // We'll be wanting to hook into the compilation process for
  // - scanning for a list of keypaths used in calls to `functionNames`
  // - scanning for instances of `translationPlaceholderConstantName` expressions
  // - replacing the placeholder expressions with an expression with the required translations
  const translationPlaceholderScanner = makeTranslationPlaceholderScanner({
    translationPlaceholderConstantName
  });
  const usedTranslationKeypathScanner = makeUsedTranslationKeypathScanner({
    functionNames
  });
  const pickUsedTranslations = makeTranslationGraphMinimizer({
    fullTranslations
  });

  return {
    // `apply` gets called _once_ to hook itself to the Compiler; it has to take care of
    // maintaining state between build runs
    apply(compiler /*: Compiler */) {
      const translationPlaceholders$ = toNonEmptyList(
        translationPlaceholderScanner(compiler)
      );

      const usedTranslationKeypaths$ = toNonEmptyList(
        usedTranslationKeypathScanner(compiler)
      );

      // 'should-emit' runs once after 'make' and allows us to bail out if we detected errors
      let error = null;
      compiler.plugin("should-emit", () => {
        console.log("Hello from should-emit");
        if (error) {
          throw error;
        }
      });

      Bacon.combineTemplate({
        translationPlaceholders: translationPlaceholders$,
        usedTranslationKeypaths: usedTranslationKeypaths$
      }).onValue(({ translationPlaceholders, usedTranslationKeypaths }) => {
        console.log("Hello from combineTemplate")
        try {
          const minimizedTranslations = pickUsedTranslations(
            usedTranslationKeypaths
          );
          replacePlaceholders({
            translationPlaceholders,
            minimizedTranslations
          });
        } catch (e) {
          error = e;
        }
      });
    }
  };
}
module.exports = I18nRuntimePlugin;

function toNonEmptyList(stream$) {
  return stream$
    .scan([], (acc, next) => {
      acc.push(next);
      return acc;
    })
    .skip(1);
}
