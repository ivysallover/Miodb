/**
 * A text Excel would run as a formula when opening a CSV (`=`, `+`, `-`, `@`: with `=HYPERLINK(…)` a sheet
 * someone else made can do things on the computer of whoever opens the export) gets a leading apostrophe,
 * Excel's own "this is text" mark. A signed number stays as it is. The desktop engine does the same
 * (`desktop/engine/src/export.rs → plain`).
 */
export const plain = (s: string): string => (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s)) ? `'${s}` : s);
