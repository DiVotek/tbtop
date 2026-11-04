/** A signed preview URL lives this long (SignedUploadUrl::TTL_MINUTES). */
export const TTL_SECONDS = 5 * 60;

async function hmac(secret: string, payload: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
	return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * URL::temporarySignedRoute for the view route: the signature binds the URL
 * path (page + field) and the file path, so it cannot be re-pointed.
 */
export async function signedViewUrl(
	secret: string,
	viewPath: string,
	file: { path: string; now?: number },
): Promise<string> {
	const expires = Math.floor((file.now ?? Date.now()) / 1000) + TTL_SECONDS;
	const query = new URLSearchParams({ path: file.path, expires: String(expires) });
	const signature = await hmac(secret, `${viewPath}?${query}`);
	return `${viewPath}?${query}&signature=${signature}`;
}

/** The `signed` middleware: a matching signature that has not expired. */
export async function hasValidSignature(secret: string, url: URL): Promise<boolean> {
	const signature = url.searchParams.get("signature") ?? "";
	const expires = Number(url.searchParams.get("expires"));
	if (!Number.isFinite(expires) || expires * 1000 < Date.now()) {
		return false;
	}
	const query = new URLSearchParams({
		path: url.searchParams.get("path") ?? "",
		expires: String(expires),
	});
	const expected = await hmac(secret, `${url.pathname}?${query}`);
	return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}
