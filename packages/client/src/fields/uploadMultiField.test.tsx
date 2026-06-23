import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clientWrapper } from "../testFixtures";
import { UploadForm, type UploadValue } from "./uploadField";

const SAMPLE: UploadValue = { path: "uploads/a.png", url: "/uploads/a.png" };
const SAMPLE2: UploadValue = { path: "uploads/b.png", url: "/uploads/b.png" };

function uploadResponse(path = "uploads/new.png", url = "/uploads/new.png") {
	return { data: { path, url } };
}

describe("UploadForm multi", () => {
	test("uploads each file and emits preview data via onChange", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						multiple: true,
						upload: async (_ctx, file) =>
							uploadResponse(`uploads/${file.name}`, `/uploads/${file.name}`),
					}}
				/>
			</Wrap>,
		);
		const file1 = new File(["x"], "file1.png", { type: "image/png" });
		const file2 = new File(["y"], "file2.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, [file1, file2]);
		await waitFor(() => expect(captured.length).toBe(2));
		const last = captured.at(-1);
		expect(Array.isArray(last)).toBe(true);
		expect((last as UploadValue[]).length).toBe(2);
		expect(last).toEqual([
			{ path: "uploads/file1.png", url: "/uploads/file1.png" },
			{ path: "uploads/file2.png", url: "/uploads/file2.png" },
		]);
	});

	test("maxFiles hides dropzone when limit is reached", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE]}
					onChange={() => {}}
					options={{ multiple: true, maxFiles: 1, upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]");
		expect(input).toBeNull();
	});

	test("shows dropzone when under maxFiles", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE]}
					onChange={() => {}}
					options={{ multiple: true, maxFiles: 3, upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]");
		expect(input).not.toBeNull();
	});

	test("remove emits preview data without the removed item", async () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const captured: (UploadValue | UploadValue[] | string | string[] | null)[] = [];
		const { getAllByRole } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={(v) => captured.push(v)}
					options={{ multiple: true, upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const removeButtons = getAllByRole("button", { name: /remove/i });
		await userEvent.click(removeButtons[0]!);
		const last = captured.at(-1) as UploadValue[];
		expect(last).toHaveLength(1);
		expect(last[0]).toEqual(SAMPLE2);
	});

	test("reorderable renders drag handles", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={() => {}}
					options={{
						multiple: true,
						reorderable: true,
						upload: async () => uploadResponse(),
					}}
				/>
			</Wrap>,
		);
		const handles = container.querySelectorAll("[data-testid^='upload-drag-handle-']");
		expect(handles.length).toBe(2);
	});

	test("non-reorderable does not render drag handles", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={() => {}}
					options={{ multiple: true, upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const handles = container.querySelectorAll("[data-testid^='upload-drag-handle-']");
		expect(handles.length).toBe(0);
	});

	test("multiple attribute is set on the file input", () => {
		const Wrap = clientWrapper(() => new Response("{}"));
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={null}
					onChange={() => {}}
					options={{ multiple: true, upload: async () => uploadResponse() }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		expect(input.multiple).toBe(true);
	});
});

describe("UploadCell multi", () => {
	test("array value renders count", () => {
		const { UploadCell } = require("./uploadField");
		const { container } = render(<UploadCell value={[SAMPLE, SAMPLE2]} />);
		expect(container.textContent).toContain("2");
	});

	test("empty array renders nothing", () => {
		const { UploadCell } = require("./uploadField");
		const { container } = render(<UploadCell value={[]} />);
		expect(container.textContent).toBe("");
	});

	test("array of string paths renders count", () => {
		const { UploadCell } = require("./uploadField");
		const { container } = render(<UploadCell value={["uploads/a.png", "uploads/b.png"]} />);
		expect(container.textContent).toContain("2");
	});
});
