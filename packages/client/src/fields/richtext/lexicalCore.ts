/**
 * Side-effect import that evaluates the `lexical` core before any `@lexical/*`
 * package does.
 *
 * Those packages read `defineExtension` and the node base classes from the core
 * at module scope, and the core is not guaranteed to be evaluated first: reach
 * one of them before it and the binding is still in its temporal dead zone, so
 * the import throws `ReferenceError: Cannot access 'X' before initialization`.
 * Which name appears depends on which package won the race.
 *
 * Bundlers hid this by hoisting the core; bun's test runner does not, so it
 * failed only when a richtext file happened to be the first lexical importer in
 * the process — an ordering that shifts as unrelated test files are added.
 *
 * Import this first from every module that imports a `@lexical/*` package.
 */
import "lexical";
