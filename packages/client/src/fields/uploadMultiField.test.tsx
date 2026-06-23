import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clientWrapper } from "../testFixtures";
import { UploadForm, type UploadValue } from "./uploadField";

const SAMPLE: UploadValue = { filename: "a.png", url: "/uploads/a.png" };
const SAMPLE2: UploadValue = { filename: "b.png", url: "/uploads/b.png" };

function uploadResponse(filename = "new.png", url = "/uploads/new.png") {
	return Response.json(
		{
			data: {
				id: "u1",
				filename,
				url,
				mimeType: "image/png",
				filesize: 1,
				width: 10,
				height: 10,
				sizes: [],
			},
		},
		{ status: 201 },
	);
}

describe("UploadForm multi", () => {
	test("uploads each file and emits an array via onChange", async () => {
		let callIndex = 0;
		const Wrap = clientWrapper(() => {
			callIndex++;
			return uploadResponse(`file${callIndex}.png`, `/uploads/file${callIndex}.png`);
		});
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{ multiple: true, entity: "media" }}
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
	});

	test("maxFiles hides dropzone when limit is reached", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE]}
					onChange={() => {}}
					options={{ multiple: true, maxFiles: 1, entity: "media" }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]");
		expect(input).toBeNull();
	});

	test("shows dropzone when under maxFiles", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE]}
					onChange={() => {}}
					options={{ multiple: true, maxFiles: 3, entity: "media" }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]");
		expect(input).not.toBeNull();
	});

	test("remove emits the array without the removed item", async () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const { getAllByRole } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={(v) => captured.push(v)}
					options={{ multiple: true, entity: "media" }}
				/>
			</Wrap>,
		);
		const removeButtons = getAllByRole("button", { name: /remove/i });
		await userEvent.click(removeButtons[0]!);
		const last = captured.at(-1) as UploadValue[];
		expect(last).toHaveLength(1);
		expect(last[0]!.filename).toBe("b.png");
	});

	test("reorderable renders drag handles", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={() => {}}
					options={{ multiple: true, reorderable: true, entity: "media" }}
				/>
			</Wrap>,
		);
		const handles = container.querySelectorAll("[data-testid^='upload-drag-handle-']");
		expect(handles.length).toBe(2);
	});

	test("non-reorderable does not render drag handles", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={[SAMPLE, SAMPLE2]}
					onChange={() => {}}
					options={{ multiple: true, entity: "media" }}
				/>
			</Wrap>,
		);
		const handles = container.querySelectorAll("[data-testid^='upload-drag-handle-']");
		expect(handles.length).toBe(0);
	});

	test("multiple attribute is set on the file input", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="files"
					value={null}
					onChange={() => {}}
					options={{ multiple: true, entity: "media" }}
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
});
