const webpack = require("webpack");

const { NullDependency } = webpack.dependencies;

// The JSON of the translations each compilation's placeholders are replaced
// with. Dependencies are restored from webpack's persistent cache without the
// plugin's state, so they look it up through the compilation they belong to.
const translationsJsonByCompilation = new WeakMap();

function translationsJsonFor(compilation) {
  const json = translationsJsonByCompilation.get(compilation);
  if (json === undefined) {
    throw new Error(
      "@venuu/i18n-js-webpack-plugin: translations are read before the compilation's modules have finished building",
    );
  }
  return json;
}

class TranslationsPlaceholderDependency extends NullDependency {
  constructor(range) {
    super();
    this.range = range;
  }

  get type() {
    return "i18n-js translations placeholder";
  }

  // The module hash keys webpack's code generation cache, so it has to change
  // whenever the translations written in place of the placeholder change.
  updateHash(hash, context) {
    hash.update(`${this.range}`);
    hash.update(translationsJsonFor(context.runtimeTemplate.compilation));
  }

  serialize(context) {
    context.write(this.range);
    super.serialize(context);
  }

  deserialize(context) {
    this.range = context.read();
    super.deserialize(context);
  }
}

TranslationsPlaceholderDependency.Template = class TranslationsPlaceholderDependencyTemplate extends (
  NullDependency.Template
) {
  apply(dependency, source, { runtimeTemplate }) {
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      `(${translationsJsonFor(runtimeTemplate.compilation)})`,
    );
  }
};

webpack.util.serialization.register(
  TranslationsPlaceholderDependency,
  "@venuu/i18n-js-webpack-plugin/lib/translations-placeholder-dependency",
  null,
  {
    serialize(dependency, context) {
      dependency.serialize(context);
    },
    deserialize(context) {
      const dependency = new TranslationsPlaceholderDependency();
      dependency.deserialize(context);
      return dependency;
    },
  },
);

TranslationsPlaceholderDependency.setTranslationsJson = (compilation, json) => {
  translationsJsonByCompilation.set(compilation, json);
};

module.exports = TranslationsPlaceholderDependency;
