/* @flow weak */

module.exports = function replacePlaceholders({
  minimizedTranslations,
  translationPlaceholders
}) {
  // We have translations but nowhere to put them!
  if (translationPlaceholders.length === 0) {
    throw new Error(
      "I18n translation placeholder not found. Have you setup I18n globals?"
    );
  } else {
    for (const placeholder of translationPlaceholders) {
      placeholder.expression = JSON.stringify(minimizedTranslations);
    }
  }
};
