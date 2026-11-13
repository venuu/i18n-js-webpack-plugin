// The bundles under test assign their results to `window`, as in a browser.
declare global {
  // eslint-disable-next-line no-var
  var window: typeof globalThis & Record<string, any>;
}

globalThis.window = globalThis as typeof globalThis & Record<string, any>;

export {};
