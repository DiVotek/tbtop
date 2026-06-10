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
	test("Slug input is readonly by default", () => {
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
	});

	test("Slug input becomes editable on focus", async () => {
		const user = userEvent.setup();
		const { getByRole } = render(
			<SlugForm
				name="slug"
				value="hello"
				onChange={() => {}}
				options={{ fromField: "title" }}
			/>,
		);
		const input = getByRole("textbox") as HTMLInputElement;
		expect(input.readOnly).toBe(true);
		await user.click(input);
		expect(input.readOnly).toBe(false);
	});

	test("Slug manual edit breaks sync for the form lifecycle", async () => {
		const user = userEvent.setup();
		const captured: (string | null)[] = [];

		function Wrapper() {
			const [val, setVal] = useState<string | null>("hello-world");
			return (
				<SlugForm
					name="slug"
					value={val}
					onChange={(v) => {
						setVal(v);
						captured.push(v);
					}}
					options={{ fromField: "title" }}
				/>
			);
		}

		const { getByRole } = render(<Wrapper />);
		const input = getByRole("textbox");
		await user.click(input);
		await user.clear(input);
		await user.type(input, "my-custom-slug");
		expect(captured.at(-1)).toBe("my-custom-slug");
	});

	test("Slug Clear button emits null and re-engages sync", async () => {
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
		// Clear emits null regardless of source — next title change will regenerate
		expect(captured.at(-1)).toBeNull();
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
		const node = s.form({ query: async () => ({ title: "", slug: "old" }) }, [
			s.slug({ name: "slug", fromField: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { getByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {
			const input = getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("");
		});
	});
});
