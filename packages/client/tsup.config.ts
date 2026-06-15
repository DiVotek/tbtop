import { defineConfig } from "tsup";

// Every runtime dep + peer stays external — consumers install them.
// tw-animate-css is a CSS-only package, pulled via styles.css, not JS.
const external = [
	"react",
	"react-dom",
	"@inertiajs/react",
	"@lexical/code",
	"@lexical/link",
	"@lexical/list",
	"@lexical/markdown",
	"@lexical/react",
	"@lexical/rich-text",
	"@lexical/selection",
	"@lexical/utils",
	"@radix-ui/react-checkbox",
	"@radix-ui/react-dialog",
	"@radix-ui/react-dropdown-menu",
	"@radix-ui/react-label",
	"@radix-ui/react-popover",
	"@radix-ui/react-radio-group",
	"@radix-ui/react-select",
	"@radix-ui/react-separator",
	"@radix-ui/react-slot",
	"@radix-ui/react-switch",
	"@radix-ui/react-tabs",
	"@radix-ui/react-tooltip",
	"class-variance-authority",
	"clsx",
	"lexical",
	"lucide-react",
	"react-colorful",
	"react-hook-form",
	"recharts",
	"sonner",
	"tailwind-merge",
	"vaul",
];

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "es2022",
	dts: true,
	splitting: true, // keeps the Lexical lazy() chunk out of the main module
	sourcemap: true,
	clean: true,
	treeshake: true,
	external,
});
