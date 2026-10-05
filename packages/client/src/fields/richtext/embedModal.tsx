import { type FormEvent, useMemo } from "react";
import { type Translate, useTranslation } from "../../i18n/i18n";
import { collectConstraints } from "../../inertia/collectConstraints";
import { compileConstraints } from "../../inertia/constraints";
import { serializeFormData } from "../../inertia/serializeFormData";
import { ActionModal } from "../../structure/modalActionBlock";
import { ModalDataProvider } from "../../structure/modalDataContext";
import { structureChildren } from "../../structure/structureChildren";
import type { ClientActionContext, StructureNode } from "../../structure/types";
import type { EmbedDef } from "./embedContext";

type Bag = Record<string, unknown>;

interface EmbedModalProps {
	def: EmbedDef;
	initial: Bag;
	onApplied: (data: Bag) => void;
	onClose: () => void;
}

/**
 * The embed's fields as an ordinary DSL form inside the admin's action modal.
 * Submit events stop here: React bubbles them out of the portal into the page form.
 */
export function EmbedModal({ def, initial, onApplied, onClose }: EmbedModalProps) {
	const t = useTranslation();
	const body = useMemo(() => embedFormNode(def, t, onApplied), [def, t, onApplied]);
	return (
		<span onSubmit={(e: FormEvent) => e.stopPropagation()}>
			<ModalDataProvider value={initial}>
				<ActionModal
					opts={{ name: `embed-${def.kind}`, modal: { title: def.label, body } }}
					open
					onOpenChange={(open) => !open && onClose()}
				/>
			</ModalDataProvider>
		</span>
	);
}

function embedFormNode(def: EmbedDef, t: Translate, onApplied: (data: Bag) => void): StructureNode {
	const formOptions = { children: def.fields, guardUnsaved: false };
	const form: StructureNode = {
		kind: "form",
		name: `embed-${def.kind}`,
		meta: {},
		options: formOptions,
	};
	const cancel = actionNode("embed-cancel", {
		label: t("field.richtext.embed_cancel"),
		consumesForm: false,
		handler: async (ctx: ClientActionContext) => ctx.modal?.close(),
	});
	const apply = actionNode("embed-apply", {
		label: t("field.richtext.embed_apply"),
		color: "primary",
		isSubmit: true,
		consumesForm: true,
		pendingIndicator: true,
		handler: async (ctx: ClientActionContext) => {
			const payload = serializeFormData(ctx.form?.data ?? {}, form);
			const data = def.apply ? await def.apply(ctx, payload) : payload;
			onApplied(data);
			ctx.modal?.close();
		},
	});
	const actions: StructureNode = {
		kind: "row",
		meta: {},
		options: { class: "justify-end", children: [cancel, apply] },
	};
	return {
		...form,
		options: {
			...formOptions,
			children: [...def.fields, actions],
			schema: compileConstraints(collectConstraints(form)),
		},
	};
}

function actionNode(name: string, options: Bag): StructureNode {
	return { kind: "action", name, meta: {}, options: { name, ...options } };
}

/** Field `default()` values seed the insert modal, the way a page form seeds its record. */
export function embedDefaults(fields: StructureNode[]): Bag {
	const out: Bag = {};
	for (const node of fields) {
		const options = node.options as Bag | undefined;
		if (!node.name) {
			Object.assign(out, embedDefaults(structureChildren(options)));
		} else if (options?.default !== undefined) {
			out[node.name] = options.default;
		}
	}
	return out;
}
