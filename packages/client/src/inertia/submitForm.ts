import type { FormDataConvertible } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { settleSubmittedForm } from "./effects";
import { liftNestedErrors } from "./fieldErrors";
import { pageBasePath } from "./pageBasePath";
import { secretFieldNames, serializeFormData } from "./serializeFormData";

type FormRecords = Record<string, Record<string, unknown>>;

export function submitHandler(
	basePath: string,
	formName: string,
	formNode: StructureNode | undefined,
): (ctx: ClientActionContext) => Promise<void> {
	return (ctx) =>
		new Promise<void>((resolve, reject) => {
			const data = serializeFormData(ctx.form?.data ?? {}, formNode) as Record<
				string,
				FormDataConvertible
			>;
			const submission = ctx.form?.beginSubmit?.();
			router.post(`${basePath}/forms/${formName}`, data, {
				preserveScroll: true,
				preserveState: true,
				onBeforeUpdate: (page) => {
					if (pageBasePath(page.url) !== basePath) {
						submission?.finish();
					} else if (!Object.keys(page.props.errors ?? {}).length) {
						submission?.prepare(
							(page.props.data as FormRecords | undefined)?.[formName],
						);
					}
				},
				onSuccess: (page) => {
					settleSubmittedForm(ctx.form, page.flash, {
						secretFields: secretFieldNames(formNode),
						commit: submission?.commit,
					});
					resolve();
				},
				onError: (errors) => reject({ errors: liftNestedErrors(errors) }),
				onFinish: () => submission?.finish(),
			});
		});
}
