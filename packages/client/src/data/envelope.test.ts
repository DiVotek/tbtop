import { describe, expect, test } from "bun:test";
import { type TabletopError, unwrap } from "./envelope";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("unwrap", () => {
	test("returns data on 2xx envelope", async () => {
		const res = jsonResponse(200, { data: { id: "p1", title: "Hi" } });
		const data = await unwrap<{ id: string; title: string }>(res);
		expect(data).toEqual({ id: "p1", title: "Hi" });
	});

	test("throws TabletopError with fields on 422", async () => {
		const res = jsonResponse(422, {
			error: {
				code: "validation",
				message: "Validation failed",
				fields: { title: "Too short" },
			},
		});
		const err = await unwrap(res).then(
			() => null,
			(e: unknown) => e as TabletopError,
		);
		expect(err).not.toBeNull();
		expect(err?.code).toBe("validation");
		expect(err?.status).toBe(422);
		expect(err?.fields).toEqual({ title: "Too short" });
	});
});
