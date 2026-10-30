import { defineConfig } from "tsup";

// One entry per public export. Splitting keeps the DSL and server classes in
// shared chunks, so an adapter's `instanceof` sees the same class as the core.
export default defineConfig({
	entry: {
		index: "src/index.ts",
		kysely: "src/adapters/kysely.ts",
		memory: "src/adapters/memory.ts",
		"local-disk": "src/adapters/localDisk.ts",
		sharp: "src/adapters/sharp.ts",
		testing: "src/testing/index.ts",
	},
	format: ["esm"],
	target: "es2022",
	platform: "neutral",
	dts: true,
	splitting: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	// Runtime deps and peers stay external.
	external: ["markdown-it", "kysely", /^node:/],
	// Keep `node:` specifiers: Workers (nodejs_compat) and Deno resolve only those.
	removeNodeProtocol: false,
});
