import { afterEach, beforeEach, expect, test } from "vitest";
import type { Stats } from "webpack";
import { makeProject, type Project } from "./utils";
import { I18nRuntimePlugin } from "../src";

const fullTranslations = {
  en: { first: "First", second: "Second", third: "Third" },
  fi: { first: "Ensimmäinen", second: "Toinen", third: "Kolmas" },
};

const pluginOptions = {
  fullTranslations,
  functionNames: ["I18n.t"],
  translationPlaceholderConstantName: "I18N_RUNTIME_TRANSLATIONS",
};

const entryCode = `
  const I18n = require("i18n-js");

  window.I18n = I18n;
  I18n.translations = I18N_RUNTIME_TRANSLATIONS;

  window.testData = {
    caller1: require("./caller1"),
    caller2: require("./caller2")
  };
`;

let project: Project;

beforeEach(() => {
  project = makeProject();
  project.writeModules({
    "ENTRY_POINT.js": entryCode,
    "caller1.js": `module.exports = () => I18n.t("first");`,
    "caller2.js": `module.exports = () => I18n.t("second");`,
  });
});

afterEach(() => {
  project.remove();
  delete window.testData;
  delete window.I18n;
});

function builtModuleNames(stats: Stats) {
  return (stats.toJson({ modules: true }).modules ?? [])
    .filter((module) => module.built)
    .map((module) => module.name);
}

test("a build with every module from the cache keeps the translations", async () => {
  await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });
  const stats = await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });

  expect(builtModuleNames(stats)).toEqual([]);
  expect(window.I18n.translations).toEqual({
    en: { first: "First", second: "Second" },
    fi: { first: "Ensimmäinen", second: "Toinen" },
  });
  expect(window.testData.caller1()).toEqual("First");
  expect(window.testData.caller2()).toEqual("Second");
});

test("keys of cached modules are kept when another module changes", async () => {
  await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });

  project.writeModules({
    "caller2.js": `module.exports = () => I18n.t("third");`,
  });
  const stats = await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });

  expect(builtModuleNames(stats)).toEqual(["./input/caller2.js"]);
  expect(window.I18n.translations).toEqual({
    en: { first: "First", third: "Third" },
    fi: { first: "Ensimmäinen", third: "Kolmas" },
  });
  expect(window.testData.caller1()).toEqual("First");
  expect(window.testData.caller2()).toEqual("Third");
});

test("changed translations replace cached ones without any module changing", async () => {
  await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });

  const stats = await project.build({
    plugin: I18nRuntimePlugin({
      ...pluginOptions,
      fullTranslations: {
        ...fullTranslations,
        en: { ...fullTranslations.en, first: "Changed" },
      },
    }),
    cache: true,
  });

  expect(builtModuleNames(stats)).toEqual([]);
  expect(window.I18n.translations.en.first).toEqual("Changed");
});

test("the placeholder is filled when no module calls the functions", async () => {
  project.writeModules({
    "ENTRY_POINT.js": `window.testData = I18N_RUNTIME_TRANSLATIONS;`,
  });

  await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });
  expect(window.testData).toEqual({});

  await project.build({
    plugin: I18nRuntimePlugin(pluginOptions),
    cache: true,
  });
  expect(window.testData).toEqual({});
});
