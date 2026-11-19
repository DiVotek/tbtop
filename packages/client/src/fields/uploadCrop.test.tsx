import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import type { ClientActionContext } from "../structure/types";
import { clientWrapper } from "../testFixtures";
import * as cropUtils from "./imageCrop";
import { UploadForm } from "./uploadField";
import type { UploadOptionsBag, UploadValue } from "./uploadUtils";

mock.module("react-easy-crop", () => ({
	default: ({
		aspect,
		onCropComplete,
		cropSize,
		setMediaSize,
	}: {
		aspect?: number;
		onCropComplete: (area: unknown, pixels: cropUtils.CropArea) => void;
		cropSize?: { width: number; height: number };
		setMediaSize: (size: { width: number; height: number }) => void;
	}) => (
		<>
			<button type="button" onClick={() => setMediaSize({ width: 512, height: 288 })}>
				Load landscape
			</button>
			<button
				type="button"
				data-aspect={aspect}
				data-width={cropSize?.width}
				data-height={cropSize?.height}
				onClick={() => onCropComplete({}, { x: 0, y: 0, width: 20, height: 10 })}
			>
				Set crop
			</button>
		</>
	),
}));

const cropped = new File(["crop"], "photo.jpg", { type: "image/jpeg" });
const image = (name = "photo.jpg") => new File(["original pixels"], name, { type: "image/jpeg" });
let screen: ReturnType<typeof within>;

beforeEach(() => {
	screen = within(document.body);
	spyOn(URL, "createObjectURL").mockReturnValue("blob:crop-test");
	spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	spyOn(cropUtils, "cropImage").mockResolvedValue(cropped);
});
afterEach(() => {
	cleanup();
	mock.restore();
});

function setup(options: UploadOptionsBag = { image: { crop: { aspectRatio: 1.5 } } }) {
	const upload = mock(async (_ctx: ClientActionContext, file: File) => ({
		path: file.name,
		url: `/storage/${file.name}`,
	}));
	const onChange = mock(() => {});
	const Wrap = clientWrapper(() => new Response("{}"));
	function Harness() {
		const [value, setValue] = useState<UploadValue | UploadValue[] | string | string[] | null>(
			null,
		);
		return (
			<UploadForm
				id="crop-upload"
				name="photo"
				value={value}
				onChange={(next) => {
					setValue(next);
					onChange();
				}}
				options={{ ...options, upload }}
			/>
		);
	}
	render(
		<Wrap>
			<Harness />
		</Wrap>,
	);
	const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
	return {
		upload,
		onChange,
		input,
		pick: (files: File[]) => fireEvent.change(input, { target: { files } }),
	};
}

async function confirm() {
	fireEvent.click(await screen.findByText("Set crop"));
	fireEvent.click(screen.getByRole("button", { name: "Crop & upload" }));
}

test("defers upload, locks aspect, then uploads cropped file after size check", async () => {
	const { upload, pick } = setup({ image: { crop: { aspectRatio: 1.5 } }, maxSize: 5 });
	pick([image()]);
	expect(await screen.findByRole("dialog")).toBeTruthy();
	expect(upload).not.toHaveBeenCalled();
	expect(screen.getByText("Set crop").getAttribute("data-aspect")).toBe("1.5");
	fireEvent.click(screen.getByText("Load landscape"));
	expect(screen.getByText("Set crop").getAttribute("data-width")).toBeNull();
	await confirm();
	await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.anything(), cropped));
	expect(screen.queryByRole("dialog")).toBeNull();
});

test("cancel uploads nothing, resets picker, and permits same file again", async () => {
	const { upload, input, pick } = setup();
	const file = image();
	pick([file]);
	fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	expect(upload).not.toHaveBeenCalled();
	expect(input.value).toBe("");
	pick([file]);
	expect(await screen.findByRole("dialog")).toBeTruthy();
});

test("AVIF, BMP, SVG, PDF and GIF bypass crop and upload original", async () => {
	for (const type of [
		"image/avif",
		"image/bmp",
		"image/svg+xml",
		"application/pdf",
		"image/gif",
	]) {
		const { upload, pick } = setup();
		const file = new File(["file"], "file", { type });
		pick([file]);
		await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.anything(), file));
		expect(screen.queryByRole("dialog")).toBeNull();
		cleanup();
	}
});

test("no crop option preserves original file uploads", async () => {
	const { upload, pick } = setup({});
	const file = image();
	pick([file]);
	await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.anything(), file));
	expect(screen.queryByRole("dialog")).toBeNull();
});

test("multiple files crop sequentially and cancel skips just one", async () => {
	const { upload, onChange, pick } = setup({ multiple: true, image: { crop: {} } });
	pick([image("first.jpg"), image("skip.jpg"), image("last.jpg")]);
	expect((await screen.findByRole("dialog")).textContent).toContain("first.jpg");
	expect(screen.getAllByRole("dialog")).toHaveLength(1);
	expect(upload).not.toHaveBeenCalled();
	expect(screen.getByRole("slider", { name: "Crop width" })).toBeTruthy();
	await confirm();
	await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("skip.jpg"));
	expect(upload).toHaveBeenCalledTimes(1);
	fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
	await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("last.jpg"));
	await confirm();
	await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
	expect(onChange).toHaveBeenCalledTimes(2);
});

test("crop failure is shown without uploading and can be cancelled", async () => {
	spyOn(cropUtils, "cropImage").mockRejectedValue(new Error("bad canvas"));
	const { upload, pick } = setup();
	pick([image()]);
	await confirm();
	expect(await screen.findByRole("alert")).toBeTruthy();
	expect(upload).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
});

test("cropped file exceeding size limit is not uploaded", async () => {
	const { upload, pick } = setup({ maxSize: 1, image: { crop: {} } });
	pick([image()]);
	await confirm();
	expect(await screen.findByText("File exceeds the maximum size")).toBeTruthy();
	expect(upload).not.toHaveBeenCalled();
});

test("free crop sliders start at the full rendered image dimensions", async () => {
	const { pick } = setup({ image: { crop: {} } });
	pick([image()]);
	fireEvent.click(await screen.findByText("Load landscape"));
	const crop = screen.getByText("Set crop");
	expect(crop.getAttribute("data-width")).toBe("512");
	expect(crop.getAttribute("data-height")).toBe("288");
});
