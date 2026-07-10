import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { SlugCell, SlugForm } from "./slugField";
import { slugify } from "./slugify";

describe("Slug field", () => {
	test("Slug input is permanently readonly", async () => {
		const user = userEvent.setup();
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value="hello-world"
				onChange={() => {}}
				options={{ fromField: "title" }}
			/>,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.readOnly).toBe(true);
		await user.click(input);
		expect(input.readOnly).toBe(true);
	});

	test("typing into the slug input does not change the value", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value="hello-world"
				onChange={(v) => captured.push(v)}
				options={{ fromField: "title" }}
			/>,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		await user.click(input);
		await user.type(input, "manual-edit");
		expect(captured).toEqual([]);
		expect(input.value).toBe("hello-world");
	});

	test("Slug Clear button emits null", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value="hello-world"
				onChange={(v) => captured.push(v)}
				options={{ fromField: "title" }}
			/>,
		);
		await user.click(getByRole("button", { name: "Clear" }));
		expect(captured.at(-1)).toBeNull();
	});

	test("a cleared slug STAYS empty (auto-derive disengaged) in a controlled form", async () => {
		const user = userEvent.setup();

		function Wrapper() {
			const [val, setVal] = useState<string | null>("hello-world");
			return (
				<SlugForm
					name="slug"
					value={val}
					onChange={setVal}
					options={{ fromField: "title" }}
				/>
			);
		}

		const { getByRole } = render(<Wrapper />);
		const input = getByRole("textbox") as HTMLInputElement;
		await user.click(getByRole("button", { name: "Clear" }));
		// The controlled value round-trips as null and must not be re-derived
		// by the effect on the following render.
		expect(input.value).toBe("");
	});

	test("Slug Generate button recomputes slug from source and re-engages sync", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value="old-slug"
				onChange={(v) => captured.push(v)}
				options={{ fromField: "title" }}
			/>,
		);
		await user.click(getByRole("button", { name: "Generate" }));
		expect(captured.at(-1)).toBeNull();
	});

	test("Slug null value renders as empty input", () => {
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value={null}
				onChange={() => {}}
				options={{ fromField: "title" }}
			/>,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.value).toBe("");
	});

	test("slugify folds non-ASCII characters via NFKD normalization", () => {
		expect(slugify("Café Résumé")).toBe("cafe-resume");
	});

	test("slugify lowercases and dashes spaces", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	test("slugify returns empty string for whitespace-only input", () => {
		expect(slugify("   ")).toBe("");
	});

	test("slugify transliterates Ukrainian/Russian Cyrillic to Latin", () => {
		expect(slugify("Про нас")).toBe("pro-nas");
		expect(slugify("Категорія")).toBe("kategoriya");
	});

	test("slugify handles mixed Cyrillic and Latin text", () => {
		expect(slugify("Про нас — About us")).toBe("pro-nas-about-us");
	});

	test("slugify still folds Latin diacritics via NFKD (not broken by the Cyrillic map)", () => {
		expect(slugify("café")).toBe("cafe");
	});

	test("slugify drops Cyrillic soft/hard signs (ъ, ь) with no Latin output", () => {
		expect(slugify("подъезд")).toBe("podezd");
	});

	test("slugify returns empty string for punctuation-only Cyrillic-adjacent input", () => {
		expect(slugify("!!! ??? ---")).toBe("");
	});

	test("SlugCell renders the value verbatim", () => {
		const { getByText } = render(<SlugCell value="my-slug-value" />);
		expect(getByText("my-slug-value")).toBeTruthy();
	});

	test("SlugCell renders empty for null value", () => {
		const { container } = render(<SlugCell value={null} />);
		expect(container.textContent).toBe("");
	});

	test("Slug form-block wraps label and required marker", async () => {
		const node = s.form({ query: async () => ({ title: "Hello World", slug: "" }) }, [
			s.slug({ name: "slug", label: "URL Slug", required: true, fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("URL Slug");
		expect(label?.querySelector("span.text-destructive")?.textContent).toBe("*");
	});

	test("Slug form-context sync: derives slug from title on mount", async () => {
		const node = s.form({ query: async () => ({ title: "Hello World", slug: "" }) }, [
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("hello-world");
		});
	});

	test("Slug form-context sync: re-syncs when source field changes", async () => {
		const user = userEvent.setup();
		const node = s.form({ query: async () => ({ title: "Hello World", slug: "" }) }, [
			s.text({ name: "title", label: "Title" }),
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		render(<Wrap>{renderNode(node)}</Wrap>);
		let titleInput!: HTMLInputElement;
		let slugInput!: HTMLInputElement;
		await waitFor(() => {
			titleInput = document.querySelector("#title") as HTMLInputElement;
			slugInput = document.querySelector("[data-field='slug'] input") as HTMLInputElement;
			expect(titleInput?.value).toBe("Hello World");
			expect(slugInput?.value).toBe("hello-world");
		});
		await user.clear(titleInput);
		await user.type(titleInput, "Café Résumé");
		await waitFor(() => {
			expect(slugInput.value).toBe("cafe-resume");
		});
	});

	test("Clear keeps the slug empty across source changes; Generate re-derives and re-engages sync", async () => {
		const user = userEvent.setup();
		const node = s.form({ query: async () => ({ title: "Hello World", slug: "" }) }, [
			s.text({ name: "title", label: "Title" }),
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		let titleInput!: HTMLInputElement;
		let slugInput!: HTMLInputElement;
		await waitFor(() => {
			titleInput = document.querySelector("#title") as HTMLInputElement;
			slugInput = document.querySelector("[data-field='slug'] input") as HTMLInputElement;
			expect(slugInput?.value).toBe("hello-world");
		});
		await user.click(getByRole("button", { name: "Clear" }));
		await waitFor(() => expect(slugInput.value).toBe(""));
		// Source keeps changing but auto-derive is off — the cleared slug stays empty.
		await user.type(titleInput, " Updated");
		expect(slugInput.value).toBe("");
		await user.click(getByRole("button", { name: "Generate" }));
		await waitFor(() => expect(slugInput.value).toBe("hello-world-updated"));
		// Generate re-engaged auto mode: further source edits derive again.
		await user.type(titleInput, " Again");
		await waitFor(() => expect(slugInput.value).toBe("hello-world-updated-again"));
	});

	test("Slug form-context sync: dotted fromField reads nested source (translatable)", async () => {
		const node = s.form(
			{ query: async () => ({ title: { en: "Hello World", uk: "Привіт" }, slug: "" }) },
			[s.slug({ name: "slug", fromField: "title.en" })],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("hello-world");
		});
	});

	test("Slug form-context sync: object source without path derives empty, not [object Object]", async () => {
		const node = s.form({ query: async () => ({ title: { en: "Hello" }, slug: "" }) }, [
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("");
		});
	});

	test("Slug form-context sync: empty source sets slug to empty string", async () => {
		// NEW CONTRACT: slug:"old" with empty source → source differs from value → manual mode,
		// slug stays "old" (not overwritten to empty).
		const node = s.form({ query: async () => ({ title: "", slug: "old" }) }, [
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		// Wait for hydration to settle; value must remain "old".
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("old");
		});
	});

	test("Slug: prefilled value preserved on mount when source title differs (edit-page bug)", async () => {
		// Regression for: opening an existing post with slug "custom-slug" while title is
		// "Different Title" must NOT overwrite the slug on mount.
		const node = s.form(
			{ query: async () => ({ title: "Different Title", slug: "custom-slug" }) },
			[s.slug({ name: "slug", fromField: "title" })],
		);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("custom-slug");
		});
	});

	test("Slug: in manual mode editing the source title must NOT regenerate the slug", async () => {
		// After mount with a prefilled slug different from the derived title, the component
		// starts in manual mode. Typing in the title source must leave the slug unchanged.
		const user = userEvent.setup();
		const node = s.form(
			{ query: async () => ({ title: "Different Title", slug: "custom-slug" }) },
			[
				s.text({ name: "title", label: "Title" }),
				s.slug({ name: "slug", fromField: "title" }),
			],
		);
		const Wrap = wrap(() => new Response("{}"));
		render(<Wrap>{renderNode(node)}</Wrap>);
		let titleInput!: HTMLInputElement;
		let slugInput!: HTMLInputElement;
		await waitFor(() => {
			titleInput = document.querySelector("#title") as HTMLInputElement;
			slugInput = document.querySelector("[data-field='slug'] input") as HTMLInputElement;
			expect(slugInput?.value).toBe("custom-slug");
		});
		await user.clear(titleInput);
		await user.type(titleInput, "Brand New Title");
		// Still manual mode — slug must not change.
		await waitFor(() => {
			expect(slugInput.value).toBe("custom-slug");
		});
	});
});
