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

	// Audit 5.20: an action handler that lets a Laravel ValidationException
	// bubble uncaught produces Laravel's OWN native JSON shape
	// ({message, errors: {field: [msg, ...]}}), not the app's custom
	// {error: {...}} envelope — this is what ActionController,
	// SelectCreateController, and EditableColumnController all actually
	// return today. Before this fix, fields stayed undefined and the field
	// errors were silently dropped down to a generic "HTTP 422" message.
	describe("Laravel's native validation-exception JSON (no custom envelope)", () => {
		test("normalizes {message, errors} into TabletopError.fields", async () => {
			const res = jsonResponse(422, {
				message: "The title field is required.",
				errors: { title: ["The title field is required."] },
			});
			const err = await unwrap(res).then(
				() => null,
				(e: unknown) => e as TabletopError,
			);
			expect(err).not.toBeNull();
			expect(err?.status).toBe(422);
			expect(err?.code).toBe("validation");
			expect(err?.message).toBe("The title field is required.");
			expect(err?.fields).toEqual({ title: "The title field is required." });
		});

		test("takes the first message when a field has multiple errors", async () => {
			const res = jsonResponse(422, {
				message: "The email field is invalid.",
				errors: { email: ["Required.", "Must be a valid email."] },
			});
			const err = await unwrap(res).then(
				() => null,
				(e: unknown) => e as TabletopError,
			);
			expect(err?.fields).toEqual({ email: "Required." });
		});

		test("a custom {error: {fields}} envelope still wins over a top-level errors key", async () => {
			const res = jsonResponse(422, {
				error: {
					code: "validation",
					message: "Custom",
					fields: { name: "Custom message" },
				},
				errors: { name: ["Should not be used"] },
			});
			const err = await unwrap(res).then(
				() => null,
				(e: unknown) => e as TabletopError,
			);
			expect(err?.fields).toEqual({ name: "Custom message" });
		});

		test("a non-validation error body with no errors key leaves fields undefined", async () => {
			const res = jsonResponse(500, { message: "Server error" });
			const err = await unwrap(res).then(
				() => null,
				(e: unknown) => e as TabletopError,
			);
			expect(err?.fields).toBeUndefined();
			expect(err?.message).toBe("Server error");
		});
	});
});
