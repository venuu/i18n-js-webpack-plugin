/* @flow */

const { compile } = require("./utils");
const I18nRuntimePlugin = require("../lib/index");

const pluginConfig = {
  fullTranslations: {
    en: {
      deep: {
        nested: { object: "Hello" },
        array: [1, 2, 3],
        null: null,
        boolFalse: false,
        boolTrue: true
      }
    },
    fi: {
      deep: {
        nested: { object: "Hei" },
        array: [4, 5, 6],
        null: null,
        boolFalse: false,
        boolTrue: true
      }
    }
  },
  functionNames: ["I18n.translate"],
  translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS"
};

afterEach(() => {
  delete window.testData;
});

test("deep nested objects work", async () => {
  await compile({
    plugin: new I18nRuntimePlugin(pluginConfig),

    modules: {
      "deepObj.js": `module.exports = I18n.translate("deep.nested");`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.locale = 'fi';
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;

      window.testData = { deepObj: require("./deepObj") };
    `
  });

  expect(window.testData.deepObj).toEqual({ object: "Hei" });
  expect(window.I18n.translations.fi.deep).toEqual({
    nested: { object: "Hei" }
  });
  expect(window.I18n.translations.en.deep).toEqual({
    nested: { object: "Hello" }
  });
});

test("arrays are exported, even if I18n.t would fail on them", async () => {
  await compile({
    plugin: new I18nRuntimePlugin(pluginConfig),

    modules: {
      "deepArray.js": `module.exports = I18n.translate("deep.array");`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.locale = 'fi';
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;

      try { window.testData = { deepArray: require("./deepArray") }; } catch (e) {}
    `
  });

  // I18n.translate fails for arrays, but we can test for I18n.translations being set
  // properly anyway
  expect(window.I18n.translations.fi.deep.array).toEqual([4, 5, 6]);
  expect(window.I18n.translations.en.deep.array).toEqual([1, 2, 3]);
  // This should not be undefined, but i18n-js gets borken
  expect(window.testData).toBeUndefined();
});

test("null works, even if I18n.t considers it missing", async () => {
  await compile({
    plugin: new I18nRuntimePlugin(pluginConfig),

    modules: {
      "null.js": `module.exports = I18n.translate("deep.null");`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.locale = 'fi';
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;
      I18n.missingTranslation = (key) => \`missing \${key\}\`

      window.testData = { nullModule: require("./null") };
    `
  });

  expect(window.I18n.translations.fi.deep.null).toEqual(null);
  expect(window.I18n.translations.en.deep.null).toEqual(null);
  expect(window.testData.nullModule).toEqual("missing deep.null");
});

test("booleans work", async () => {
  await compile({
    plugin: new I18nRuntimePlugin(pluginConfig),

    modules: {
      "true.js": `module.exports = I18n.translate("deep.boolTrue");`,
      "false.js": `module.exports = I18n.translate("deep.boolFalse");`
    },

    entryCode: `
      const I18n = require("i18n-js");

      window.I18n = I18n;
      I18n.locale = 'fi';
      I18n.translations = I18N_RUNTIME_TRANSLATIONS;
      I18n.missingTranslation = (key) => \`missing \${key\}\`

      window.testData = {
        trueModule: require("./true"),
        falseModule: require("./false")
      };
    `
  });

  expect(window.I18n.translations.fi.deep.boolFalse).toEqual(false);
  expect(window.I18n.translations.fi.deep.boolTrue).toEqual(true);
  expect(window.I18n.translations.en.deep.boolFalse).toEqual(false);
  expect(window.I18n.translations.en.deep.boolTrue).toEqual(true);
  expect(window.testData.trueModule).toEqual(true);
  expect(window.testData.falseModule).toEqual(false);
});
