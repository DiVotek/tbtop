import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowProvider } from "../structure/rowContext";
import { clientWrapper } from "../testFixtures";
import { UploadCell, UploadForm, type UploadValue } from "./uploadField";

const SAMPLE: UploadValue = { filename: "pic.png", url: "/uploads/pic.png" };

function uploadResponse(row: Partial<UploadValue> & { mimeType?: string } = {}) {
	return Response.json(
		{
			data: {
				id: "u1",
				filename: row.filename ?? "pic.png",
				url: row.url ?? "/uploads/pic.png",
				mimeType: row.mimeType ?? "image/png",
				filesize: 1,
				width: 10,
				height: 10,
				sizes: [],
			},
		},
		{ status: 201 },
	);
}

describe("UploadForm", () => {
	test("Upload posts the picked file to the configured entity and emits the new value", async () => {
		const seen: string[] = [];
		const Wrap = clientWrapper((req) => {
			seen.push(req.url);
			return uploadResponse({ filename: "hello.png", url: "/uploads/hello.png" });
		});
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{ entity: "media" }}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "hello.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(seen[0]).toBe("http://test/admin/uploads/media");
		// Full UploadRow flows through so submit handlers can persist metadata.
		expect(captured.at(-1)).toMatchObject({
			filename: "hello.png",
			url: "/uploads/hello.png",
			mimeType: "image/png",
		});
	});

	test("Upload surfaces a server error message and does not call onChange", async () => {
		const Wrap = clientWrapper(() =>
			Response.json(
				{ error: { code: "bad_request", message: "File too large" } },
				{ status: 413 },
			),
		);
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const { container, getByRole } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{ entity: "media" }}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "huge.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(getByRole("alert").textContent).toContain("File too large"));
		expect(captured).toHaveLength(0);
	});

	test("Upload with a value renders preview and clears to null on remove", async () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const { getByRole, getByText } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={SAMPLE}
					onChange={(v) => captured.push(v)}
					options={{ entity: "media" }}
				/>
			</Wrap>,
		);
		expect(getByText("pic.png")).toBeTruthy();
		await userEvent.click(getByRole("button", { name: /remove/i }));
		expect(captured.at(-1)).toBeNull();
	});

	test("Upload uses the injected upload closure and emits the unwrapped row", async () => {
		const seen: File[] = [];
		const row = {
			id: "u9",
			filename: "doc.png",
			url: "/uploads/doc.png",
			mimeType: "image/png",
			filesize: 1,
			width: 10,
			height: 10,
			sizes: [],
		};
		const captured: (UploadValue | UploadValue[] | null)[] = [];
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={(v) => captured.push(v)}
					options={{
						upload: async (_ctx, file) => {
							seen.push(file);
							return { data: row };
						},
					}}
				/>
			</Wrap>,
		);
		const file = new File(["x"], "doc.png", { type: "image/png" });
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		await userEvent.upload(input, file);
		await waitFor(() => expect(captured.length).toBeGreaterThan(0));
		expect(seen[0]).toBe(file);
		expect(captured.at(-1)).toMatchObject({
			filename: "doc.png",
			url: "/uploads/doc.png",
			mimeType: "image/png",
		});
	});

	test("Upload accept attribute forwards to the file input", () => {
		const Wrap = clientWrapper(() => uploadResponse());
		const { container } = render(
			<Wrap>
				<UploadForm
					name="file"
					value={null}
					onChange={() => {}}
					options={{ entity: "media", accept: "image/*" }}
				/>
			</Wrap>,
		);
		const input = container.querySelector("input[type=file]") as HTMLInputElement;
		expect(input.getAttribute("accept")).toBe("image/*");
	});
});

describe("UploadCell", () => {
	test("UploadCell with an image row renders an img with the row url", () => {
		const row = { mimeType: "image/png", url: "/u/a.png", filename: "a.png" };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={SAMPLE} />
			</RowProvider>,
		);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/u/a.png");
	});

	test("UploadCell with an image row and empty sizes falls back to row.url", () => {
		const row = { mimeType: "image/png", url: "/u/a.png", filename: "a.png", sizes: [] };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={SAMPLE} />
			</RowProvider>,
		);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/u/a.png");
	});

	test("UploadCell with an image row picks the smallest variant when sizes are present", () => {
		const row = {
			mimeType: "image/png",
			url: "/u/a.png",
			filename: "a.png",
			sizes: [
				{ url: "/u/a-thumb.png", width: 64 },
				{ url: "/u/a-med.png", width: 256 },
			],
		};
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={SAMPLE} />
			</RowProvider>,
		);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/u/a-thumb.png");
	});

	test("UploadCell with a non-image row renders the filename", () => {
		const row = { mimeType: "application/pdf", url: "/u/a.pdf", filename: "a.pdf" };
		const { container } = render(
			<RowProvider value={row}>
				<UploadCell value={null} />
			</RowProvider>,
		);
		expect(container.textContent).toContain("a.pdf");
	});

	test("UploadCell with no value and no row renders nothing", () => {
		const { container } = render(<UploadCell value={null} />);
		expect(container.textContent).toBe("");
	});
});
