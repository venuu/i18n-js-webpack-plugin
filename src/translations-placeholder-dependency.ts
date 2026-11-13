import webpack from "webpack";
import type { Compilation } from "webpack";

type Range = [number, number];
type UpdateHashArgs = Parameters<
  webpack.dependencies.NullDependency["updateHash"]
>;
type SerializerContext = Parameters<
  webpack.dependencies.NullDependency["serialize"]
>[0];
type DeserializerContext = Parameters<
  webpack.dependencies.NullDependency["deserialize"]
>[0];
type TemplateApplyArgs = Parameters<
  InstanceType<typeof webpack.dependencies.NullDependency.Template>["apply"]
>;

// The JSON of the translations each compilation's placeholders are replaced
// with. Dependencies are restored from webpack's persistent cache without the
// plugin's state, so they look it up through the compilation they belong to.
const translationsJsonByCompilation = new WeakMap<Compilation, string>();

export function setTranslationsJson(
  compilation: Compilation,
  json: string,
): void {
  translationsJsonByCompilation.set(compilation, json);
}

function translationsJsonFor(compilation: Compilation): string {
  const json = translationsJsonByCompilation.get(compilation);
  if (json === undefined) {
    throw new Error(
      "@venuu/i18n-js-webpack-plugin: translations are read before the compilation's modules have finished building",
    );
  }
  return json;
}

export class TranslationsPlaceholderDependency
  extends webpack.dependencies.NullDependency
{
  range: Range;

  // Without arguments when webpack restores the dependency from its cache.
  constructor(range: Range = [0, 0]) {
    super();
    this.range = range;
  }

  get type(): string {
    return "i18n-js translations placeholder";
  }

  // The module hash keys webpack's code generation cache, so it has to change
  // whenever the translations written in place of the placeholder change.
  updateHash(...[hash, context]: UpdateHashArgs): void {
    hash.update(`${this.range}`);
    if (!context.runtimeTemplate) {
      throw new Error(
        "@venuu/i18n-js-webpack-plugin: webpack hashed the translations placeholder without a runtime template",
      );
    }
    hash.update(translationsJsonFor(context.runtimeTemplate.compilation));
  }

  serialize(context: SerializerContext): void {
    context.write(this.range);
    super.serialize(context);
  }

  deserialize(context: DeserializerContext): void {
    this.range = context.read();
    super.deserialize(context);
  }
}

export class TranslationsPlaceholderDependencyTemplate
  extends webpack.dependencies.NullDependency.Template
{
  apply(...[dependency, source, { runtimeTemplate }]: TemplateApplyArgs): void {
    const { range } = dependency as TranslationsPlaceholderDependency;
    source.replace(
      range[0],
      range[1] - 1,
      `(${translationsJsonFor(runtimeTemplate.compilation)})`,
    );
  }
}

webpack.util.serialization.register(
  TranslationsPlaceholderDependency,
  "@venuu/i18n-js-webpack-plugin/dist/translations-placeholder-dependency",
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
