import type { Translation, Translations } from "./plugin";

type TranslationTree = { [key: string]: Translation };

// Picks the translations at the given keypaths, in every locale, out of the
// full translations into a new object of the same shape.
export function pickUsedTranslations(
  fullTranslations: Translations,
  keypaths: Iterable<string>,
): Translations {
  const picked: Translations = {};
  const locales = Object.keys(fullTranslations);

  // Sorted so that the emitted JSON doesn't depend on module build order.
  for (const keypath of [...new Set(keypaths)].sort()) {
    for (const locale of locales) {
      const path = [locale, ...keypath.split(".")];
      const value = valueAt(fullTranslations, path);
      if (value !== undefined) {
        setValueAt(picked, path, value);
      }
    }
  }

  return picked;
}

function valueAt(
  tree: TranslationTree,
  path: Array<string>,
): Translation | undefined {
  let current: Translation | undefined = tree;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    // Arrays are indexed by keypath segments too, as in `list.0`.
    current = (current as TranslationTree)[key];
  }
  return current;
}

function setValueAt(
  tree: TranslationTree,
  path: Array<string>,
  value: Translation,
): void {
  let current = tree;
  for (const key of path.slice(0, -1)) {
    const next = current[key];
    if (isTree(next)) {
      current = next;
    } else {
      const created: TranslationTree = {};
      current[key] = created;
      current = created;
    }
  }
  current[path[path.length - 1]] = value;
}

function isTree(
  translation: Translation | undefined,
): translation is TranslationTree {
  return (
    translation !== null &&
    typeof translation === "object" &&
    !Array.isArray(translation)
  );
}
