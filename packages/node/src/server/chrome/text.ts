/**
 * A label resolved per request. Panel config is built once, so a translated
 * label is a function: `() => trans("nav.posts")` reads the request's locale.
 */
export type Text = string | (() => string);

export const text = (value: Text): string => (typeof value === "function" ? value() : value);
