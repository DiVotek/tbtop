import type { Upload } from "../../dsl";
import { HttpError, invalid, notFound } from "../http";
import { diskFor, type FieldConfig, fieldConfig } from "../uploads/config";
import { rememberIssued } from "../uploads/issued";
import { hasValidSignature } from "../uploads/signing";
import { storeUpload } from "../uploads/store";
import { uploadUrl } from "../uploads/urls";
import { arg, type Endpoint, type EndpointCtx } from "./types";

function uploadField(ctx: EndpointCtx): { field: Upload; config: FieldConfig } {
	const field = ctx.resolved.s.findUploadField(arg(ctx, 0));
	if (field === null) {
		throw notFound(`Upload field "${arg(ctx, 0)}" is not defined on this page.`);
	}
	return { field, config: fieldConfig(field) };
}

/** The page URL path an upload route hangs under. */
function pagePath(ctx: EndpointCtx): string {
	return new URL(ctx.request.url).pathname.replace(/\/uploads\/[^/]+(\/view)?\/?$/, "");
}

/**
 * POST uploads/{field} (FieldUploadController): disk, directory, accept and
 * conversion come from the field's DSL config; the path is remembered as
 * issued to this session, and a private file answers with a signed URL.
 */
const upload: Endpoint = {
	method: "POST",
	pattern: ["uploads", ":field"],
	async run(ctx) {
		const { field, config } = uploadField(ctx);
		const file = (await ctx.request.formData().catch(() => null))?.get("file");
		if (!(file instanceof File)) {
			throw invalid({ file: ["The file field is required."] });
		}
		const saver = field.saveClosure();
		const stored = saver
			? await saver(file, { ...config })
			: await storeUpload(file, config, ctx.options);
		await rememberIssued(ctx.session, field.name, stored.path);
		const url =
			config.visibility === "private"
				? await uploadUrl(
						{ options: ctx.options, pagePath: pagePath(ctx) },
						{ field: field.name, config, path: stored.path },
					)
				: stored.url;
		return { data: { path: stored.path, url } };
	},
};

/**
 * GET uploads/{field}/view?path=… (FieldUploadViewController): streams a
 * private file behind a signed URL, inside the field's own directory only.
 */
const view: Endpoint = {
	method: "GET",
	pattern: ["uploads", ":field", "view"],
	async run(ctx) {
		const { config } = uploadField(ctx);
		const url = new URL(ctx.request.url);
		if (config.visibility !== "private") {
			throw notFound("Public uploads have no view route.");
		}
		if (
			ctx.options.secret === undefined ||
			!(await hasValidSignature(ctx.options.secret, url))
		) {
			throw new HttpError(403, "Invalid signature.");
		}
		const path = url.searchParams.get("path") ?? "";
		assertInZone(path, config.directory);
		const blob = await diskFor(ctx.options, config).get(path);
		if (blob === null) {
			throw notFound("File not found.");
		}
		return new Response(blob, {
			headers: { "content-type": blob.type, "x-content-type-options": "nosniff" },
		});
	},
};

/** A signed path must still stay inside the field's upload directory. */
function assertInZone(path: string, directory: string): void {
	const zone = directory.replaceAll(/^\/+|\/+$/g, "");
	if (path.includes("..") || zone === "" || !path.startsWith(`${zone}/`)) {
		throw new HttpError(403, "This action is unauthorized.");
	}
}

export const UPLOAD_ENDPOINTS = [upload, view];
