/**
 * Runs the core inside workerd (`wrangler dev`) and drives it over HTTP: a
 * Node-only API that bundles fine but fails at runtime shows up here.
 */
const WRANGLER = "wrangler@4.151.3";
const BASE = "http://127.0.0.1:8787";

interface Probe {
	name: string;
	init?: RequestInit;
	path: string;
	status: number;
	contains?: string;
}

const PROBES: Probe[] = [
	{ name: "page HTML", path: "/admin/posts", status: 200, contains: 'data-page="app"' },
	{ name: "table JSON", path: "/admin/posts/tables/posts", status: 200, contains: '"_key":' },
	{
		name: "Inertia form submit",
		path: "/admin/posts/2/edit/forms/post",
		init: {
			method: "POST",
			body: JSON.stringify({ title: "" }),
			headers: { "content-type": "application/json", "x-inertia": "true" },
			redirect: "manual",
		},
		status: 303,
	},
];

async function waitForServer(): Promise<void> {
	for (let attempt = 0; attempt < 60; attempt++) {
		const up = await fetch(BASE).then(
			() => true,
			() => false,
		);
		if (up) {
			return;
		}
		await Bun.sleep(1000);
	}
	throw new Error("wrangler dev did not start within 60s");
}

async function probe({ name, path, init, status, contains }: Probe): Promise<string | null> {
	const res = await fetch(`${BASE}${path}`, init);
	const body = await res.text();
	if (res.status !== status) {
		return `${name}: expected ${status}, got ${res.status}: ${body.slice(0, 300)}`;
	}
	return contains !== undefined && !body.includes(contains)
		? `${name}: missing ${contains}`
		: null;
}

const server = Bun.spawn(["bunx", WRANGLER, "dev", "--ip", "127.0.0.1", "--port", "8787"], {
	cwd: import.meta.dir,
	stdout: "inherit",
	stderr: "inherit",
});
try {
	await waitForServer();
	const failures = (await Promise.all(PROBES.map(probe))).filter((f) => f !== null);
	if (failures.length > 0) {
		console.error(failures.join("\n"));
		process.exitCode = 1;
	} else {
		console.log(`workerd: ${PROBES.length} probes passed`);
	}
} finally {
	server.kill();
}
