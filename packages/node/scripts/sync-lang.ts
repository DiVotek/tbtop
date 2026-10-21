/**
 * Copies the PHP package's translations into `lang/<locale>.json`, flattened to
 * dot keys (LocaleService::messagesFor). The PHP files stay the source; rerun
 * after they change: `bun run sync:lang` (needs `php` on PATH).
 */
import { readdirSync } from "node:fs";

const SOURCE = `${import.meta.dir}/../../php/resources/lang`;
const TARGET = `${import.meta.dir}/../lang`;

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(tree)) {
		const dotted = prefix === "" ? key : `${prefix}.${key}`;
		Object.assign(
			out,
			typeof value === "string" ? { [dotted]: value } : flatten(value, dotted),
		);
	}
	return out;
}

async function load(file: string): Promise<Tree> {
	const php = Bun.spawn(["php", "-r", "echo json_encode(require $argv[1]);", file]);
	const json = await new Response(php.stdout).text();
	if ((await php.exited) !== 0) {
		throw new Error(`php failed on ${file}`);
	}
	return JSON.parse(json) as Tree;
}

for (const locale of readdirSync(SOURCE)) {
	const messages = flatten(await load(`${SOURCE}/${locale}/admin.php`));
	await Bun.write(`${TARGET}/${locale}.json`, `${JSON.stringify(messages, null, "\t")}\n`);
	console.log(`lang/${locale}.json: ${Object.keys(messages).length} keys`);
}
