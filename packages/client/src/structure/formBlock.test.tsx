import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

describe("Form integration", () => {
	// TODO: flaky on GitHub Actions runners (passes locally + in Docker linux/amd64). Debug separately.
	test.skip("Form initial mirrors resolved query payload and renders form-block", async () => {
		const node = s.form(
			{
				query: async () => ({ id: "p1", title: "Hello", body: "World" }),
			},
			[s.text({ name: "title" })],
		);
		const Wrap = wrap(() => new Response("{}", { status: 200 }));
		const { getByTestId, getByDisplayValue } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		expect(getByDisplayValue("Hello")).toBeTruthy();
	});

	test("Form skeleton renders while query is pending", () => {
		const node = s.form({ query: () => new Promise(() => {}) }, [s.text({ name: "title" })]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("form-skeleton")).toBeTruthy();
	});

	test("Form custom loading override renders instead of default skeleton", () => {
		const Custom = () => <div data-testid="custom-loading">loading…</div>;
		const node = s.form({ query: () => new Promise(() => {}), loading: <Custom /> }, [
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("custom-loading")).toBeTruthy();
		expect(queryByTestId("form-skeleton")).toBeNull();
	});

	test("Form error component renders when query rejects", async () => {
		const node = s.form({ query: async () => Promise.reject(new Error("boom")) }, [
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-error").textContent).toBe("boom"));
	});

	test("Form action handler receives form controller with current data", async () => {
		let seenInitial: unknown = null;
		let seenData: unknown = null;
		const node = s.form({ query: async () => ({ title: "Hello" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "save",
				handler: async (c) => {
					seenInitial = c.form?.initial;
					seenData = c.form?.data;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		expect(seenInitial).toEqual({ title: "Hello" });
		expect(seenData).toEqual({ title: "Hello" });
	});

	test("Form set updates data, isDirty flips, changedFields reflects the diff", async () => {
		let seenInitial: unknown = null;
		let seenData: unknown = null;
		let seenDirty: boolean | undefined;
		let seenChanged: string[] | undefined;
		const node = s.form({ query: async () => ({ title: "Hello", body: "World" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => {
					c.form?.set("title", "Hi");
				},
			}),
			s.action({
				name: "save",
				handler: async (c) => {
					seenInitial = c.form?.initial;
					seenData = c.form?.data;
					seenDirty = c.form?.isDirty;
					seenChanged = c.form?.changedFields;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});
		const saveBtn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(saveBtn);
		});
		expect(seenInitial).toEqual({ title: "Hello", body: "World" });
		expect(seenData).toEqual({ title: "Hi", body: "World" });
		expect(seenDirty).toBe(true);
		expect(seenChanged).toEqual(["title"]);
	});

	test("Form reset returns data to initial and clears isDirty", async () => {
		let stage1Dirty: boolean | undefined;
		let stage2Dirty: boolean | undefined;
		const node = s.form({ query: async () => ({ title: "Hello" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Hi"),
			}),
			s.action({
				name: "checkAfterEdit",
				handler: async (c) => {
					stage1Dirty = c.form?.isDirty;
				},
			}),
			s.action({
				name: "reset",
				handler: async (c) => c.form?.reset(),
			}),
			s.action({
				name: "checkAfterReset",
				handler: async (c) => {
					stage2Dirty = c.form?.isDirty;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const edit = await findByTestId("action-edit");
		const checkEdit = await findByTestId("action-checkAfterEdit");
		const reset = await findByTestId("action-reset");
		const checkReset = await findByTestId("action-checkAfterReset");
		await act(async () => {
			fireEvent.click(edit);
		});
		await act(async () => {
			fireEvent.click(checkEdit);
		});
		await act(async () => {
			fireEvent.click(reset);
		});
		await act(async () => {
			fireEvent.click(checkReset);
		});
		expect(stage1Dirty).toBe(true);
		expect(stage2Dirty).toBe(false);
	});
});

const makeBlockingSchema = () => ({
	parse(input: unknown) {
		const data = input as { title?: string };
		if (!data.title || data.title.length < 3) {
			const err = new Error("validation failed") as Error & {
				issues: { path: string[]; message: string }[];
			};
			err.issues = [{ path: ["title"], message: "too short" }];
			throw err;
		}
		return input;
	},
});

describe("Form validation cadence", () => {
	// TODO: flaky on GitHub Actions runners (passes locally + in Docker linux/amd64). Debug separately.
	test.skip("Form unchanged touched field is not revalidated on blur", async () => {
		const schema = makeBlockingSchema();
		const node = s.form({ query: async () => ({ title: "ab" }), schema }, [
			s.text({ name: "title" }),
			s.action({ name: "noop", handler: async () => {} }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByDisplayValue, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const input = await findByDisplayValue("ab");
		await act(async () => {
			fireEvent.focus(input);
			fireEvent.blur(input);
		});
		expect(queryByTestId("field-error-title")).toBeNull();
	});

	test("Form schema parse blocks handler when invalid", async () => {
		let handlerFired = false;
		const node = s.form(
			{ query: async () => ({ title: "ab" }), schema: makeBlockingSchema() },
			[
				s.text({ name: "title" }),
				s.action({
					name: "save",
					handler: async () => {
						handlerFired = true;
					},
				}),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		expect(handlerFired).toBe(false);
	});
});

describe("Form 422 auto-handling", () => {
	test("Form server field errors render inline without consumer wiring", async () => {
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "too long" };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		const fieldError = await findByTestId("field-error-title");
		expect(fieldError.textContent).toBe("too long");
	});

	test("Form server nested errors shape errors:{name:[msg]} populates field errors", async () => {
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			s.text({ name: "title" }),
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						errors: Record<string, string[]>;
					};
					err.errors = { title: ["too long"] };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		const fieldError = await findByTestId("field-error-title");
		expect(fieldError.textContent).toBe("too long");
	});

	test("Form schema parse surfaces issue messages inline", async () => {
		const schema = {
			parse(input: unknown) {
				const data = input as { title?: string };
				if (!data.title || data.title.length < 3) {
					const err = new Error("validation failed") as Error & {
						issues: { path: string[]; message: string }[];
					};
					err.issues = [{ path: ["title"], message: "too short" }];
					throw err;
				}
				return input;
			},
		};
		const node = s.form({ query: async () => ({ title: "ab" }), schema }, [
			s.text({ name: "title" }),
			s.action({ name: "save", handler: async () => {} }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});
		const fieldError = await findByTestId("field-error-title");
		expect(fieldError.textContent).toBe("too short");
	});
});
