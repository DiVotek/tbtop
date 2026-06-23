// crypto.randomUUID is secure-context-only; falls back for plain-HTTP LANs.
// IDs are client-only React keys, never persisted — non-crypto entropy is fine.
export function safeUuid(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	const bytes = randomBytes16();
	bytes.set([((bytes.at(6) ?? 0) & 0x0f) | 0x40], 6); // version 4
	bytes.set([((bytes.at(8) ?? 0) & 0x3f) | 0x80], 8); // variant 10xx
	return formatUuid(bytes);
}

function randomBytes16(): Uint8Array {
	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		crypto.getRandomValues(bytes);
		return bytes;
	}
	for (let i = 0; i < bytes.length; i++) {
		bytes.set([Math.floor(Math.random() * 256)], i);
	}
	return bytes;
}

function formatUuid(bytes: Uint8Array): string {
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
