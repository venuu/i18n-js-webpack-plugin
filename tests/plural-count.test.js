/* @flow */

const { compile } = require("./utils");
const I18nRuntimePlugin = require("../lib/index");

afterEach(() => {
  delete window.testData;
});

test("plural works as it should", async () => {
  const pluginConfig = {
    fullTranslations: {
      en: {
        venue: {
          one: "one venue",
          other: "%{count} venues"
        }
      },
      fi: {
        venue: {
          one: "yksi tila",
          other: "%{count} tilaa"
        }
      }
    },
    functionNames: ["I18n.t"],
    translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS"
  };

  await compile({
    plugin: new I18nRuntimePlugin(pluginConfig),

    modules: {
      "oneVenue.js": `module.exports = I18n.t("venue", { count: 1 });`,
      "tenVenues.js": `module.exports = I18n.t("venue", { count: 10 });`,
      "oneFiVenue.js": `module.exports = I18n.t("venue", { count: 1, locale: 'fi' });`,
      "tenFiVenues.js": `module.exports = I18n.t("venue", { count: 10, locale: 'fi' });`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.locale = 'en';
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;

      window.testData = {
        oneVenue: require("./oneVenue"),
        tenVenues: require("./tenVenues"),
        oneFiVenue: require("./oneFiVenue"),
        tenFiVenues: require("./tenFiVenues")
      };
    `
  });

  expect(window.testData).toEqual({
    oneVenue: "one venue",
    tenVenues: "10 venues",
    oneFiVenue: "yksi tila",
    tenFiVenues: "10 tilaa"
  });
});
