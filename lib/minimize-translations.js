/* @flow */

const { set, view, lensPath } = require('ramda');
const uniq = require('lodash/uniq');

const flatten = arrays => [].concat(...arrays);

/*::
type Locale = string;
type Translation = string | { [key: string]: Translation };
type Translations = { [locale: Locale]: { [key: string]: Translation } }
type Options = {|
  fullTranslations: Translations
|};
*/

function keypathsWithLocales(
  keypaths /*: Array<string>*/,
  locales /*: Array<string>*/
) /*: Array<string> */ {
  return flatten(
    uniq(keypaths)
      .map(keypath => locales.map(locale => `${locale}.${keypath}`))
      // Keep the order of emitted JSON consistent by sorting the keypaths
      .sort()
  );
}

module.exports = function makeTranslationGraphMinimizer(
  { fullTranslations } /*: Options */
) {
  const locales = Object.keys(fullTranslations);

  return function pickUsedTranslations(
    usedTranslationKeypaths /*: Array<string> */
  ) {
    // For each used keypath, pick the corresponding value in the fullTranslations graph
    // into minimizedTranslations
    return keypathsWithLocales(usedTranslationKeypaths, locales)
      // $FlowFixMe ramda types get mixed up here
      .map(keypath => lensPath(keypath.split('.')))
      .reduce((minimizedTranslations, translationLens) => {
        const translation = view(translationLens, fullTranslations);
        return set(translationLens, translation, minimizedTranslations);
      }, {});
  };
};
