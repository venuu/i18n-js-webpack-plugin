// Picks the translations at the given keypaths, in every locale, out of the
// full translations into a new object of the same shape.
module.exports = function pickUsedTranslations(fullTranslations, keypaths) {
  const picked = {};
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
};

function valueAt(object, path) {
  let current = object;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function setValueAt(object, path, value) {
  let current = object;
  for (const key of path.slice(0, -1)) {
    if (current[key] === null || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = value;
}
