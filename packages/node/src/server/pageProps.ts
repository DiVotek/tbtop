import { materialize, Upload } from "../dsl";
import { asJson, type Json } from "./http";
import { type PageDef, resolveText } from "./page";
import { sharedProps } from "./panel";
import type { Resolved } from "./resolve";
import type { UploadOptions } from "./uploads/config";
import { withUploadUrls } from "./uploads/urls";

/** Top-level upload fields: the record keys PageController rewrites to `{path, url}`. */
const uploadFields = (fields: unknown[]) => fields.filter((f): f is Upload => f instanceof Upload);

/** The Inertia `admin/page` props, unchanged: the React client reads exactly this. */
export interface AdminPageProps {
	slug: string;
	title: string;
	subtitle?: string;
	layout: "admin" | "center";
	structure: { [key: string]: Json };
	data: { [form: string]: { [key: string]: Json } };
	params: Record<string, string>;
	headerActions?: Json[];
	navGroup?: string;
	tbtop: { [key: string]: Json };
}

/** PageController::show(): the tree, every included form's record, the shared panel prop. */
export async function buildPageProps(
	resolved: Resolved,
	panel: {
		prefix: string;
		brand?: string;
		pages: PageDef[];
		locales: string[];
		uploads: UploadOptions;
	},
): Promise<AdminPageProps> {
	const { page, ctx, s, tree, headerActions } = resolved;
	const forms = [...s.collectedForms()].filter(([, form]) => form.isIncluded());
	const scope = { options: panel.uploads, pagePath: new URL(ctx.request.url).pathname };
	return asJson<AdminPageProps>({
		slug: page.path,
		title: resolveText(page.title, ctx) ?? "",
		subtitle: resolveText(page.subtitle, ctx),
		layout: page.layout ?? "admin",
		structure: await materialize(tree),
		data: Object.fromEntries(
			await Promise.all(
				forms.map(async ([name, form]) => [
					name,
					await withUploadUrls(form.recordData(), uploadFields(form.getFields()), scope),
				]),
			),
		),
		params: ctx.params,
		headerActions: headerActions.length > 0 ? await materialize(headerActions) : undefined,
		navGroup: page.nav?.group || undefined,
		tbtop: sharedProps(panel),
	});
}
