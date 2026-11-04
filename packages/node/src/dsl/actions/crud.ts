import { trans } from "../../i18n";
import type { ActionBuilder } from "../action";
import type { ActionCtx } from "../actionCtx";
import { Effects } from "../effects";
import type { FormBuilder } from "../form";
import type { S } from "../s";
import { closeButton, RecordAction, type RecordFn } from "./record";

/** A primary submit with a default tail (Create/Edit modals). */
interface InnerSave {
	name: string;
	label: string;
	fn: RecordFn;
	tail: () => Effects;
	needs: ("row" | "form")[];
}

function innerSave(s: S, save: InnerSave): ActionBuilder {
	return s
		.action(save.name)
		.label(save.label)
		.color("primary")
		.handle(async (ctx) => {
			const result = await save.fn(ctx);
			return result instanceof Effects ? result : save.tail();
		}, save.needs);
}

/** Create-in-modal: the form plus Create/Cancel (CreateAction.php). */
export const CreateAction = {
	make(
		s: S,
		opts: {
			form: FormBuilder;
			storeUsing: RecordFn;
			defaultRecord?: Record<string, unknown>;
			name?: string;
			title?: string;
		},
	): ActionBuilder {
		const name = opts.name ?? "create";
		opts.form.record(opts.defaultRecord ?? {});
		const tail = () =>
			Effects.make().notify(trans("entity.create.success")).closeModal().refreshTable();
		const actions = [
			innerSave(s, {
				name: `${name}Store`,
				label: trans("action.create"),
				fn: opts.storeUsing,
				tail,
				needs: ["form"],
			}),
			closeButton(s, `${name}Cancel`, trans("action.cancel")),
		];
		return s
			.action(name)
			.label(trans("action.create"))
			.modal(
				opts.title ?? trans("create.title"),
				RecordAction.formWithActions(opts.form, s, actions),
			);
	},
};

/** Edit-in-modal, preloaded per row by a query (EditAction.php). */
export const EditAction = {
	make(
		s: S,
		opts: {
			form: FormBuilder;
			loadUsing: (ctx: ActionCtx) => unknown;
			saveUsing: RecordFn;
			name?: string;
			title?: string;
			saveName?: string;
		},
	): ActionBuilder {
		const name = opts.name ?? "edit";
		const tail = () =>
			Effects.make().notify(trans("entity.update.success")).closeModal().refreshTable();
		const actions = [
			innerSave(s, {
				name: opts.saveName ?? `${name}Save`,
				label: trans("action.save"),
				fn: opts.saveUsing,
				tail,
				needs: ["row", "form"],
			}),
			closeButton(s, `${name}Cancel`, trans("action.cancel")),
		];
		return s
			.action(name)
			.label(trans("action.edit"))
			.modal(
				opts.title ?? trans("edit.title"),
				RecordAction.formWithActions(opts.form, s, actions),
			)
			.query(opts.loadUsing, ["row"]);
	},
};

/** A read-only detail modal; displayValue().field() nodes read the loaded data (ViewAction.php). */
export const ViewAction = {
	make(
		s: S,
		opts: {
			loadUsing: (ctx: ActionCtx) => unknown;
			render: () => unknown;
			name?: string;
			title?: string;
		},
	): ActionBuilder {
		const name = opts.name ?? "view";
		const body = s.stack([
			opts.render(),
			s.actionsRow([closeButton(s, `${name}Close`, "Close")]),
		]);
		return s
			.action(name)
			.label("View")
			.modal(opts.title ?? "View record", body)
			.query(opts.loadUsing, ["row"]);
	},
};

/** Confirmed, danger-styled delete of a row or the selection (DeleteAction.php). */
export const DeleteAction = {
	make(s: S, using: RecordFn, opts: { name?: string; bulk?: boolean } = {}): ActionBuilder {
		const bulk = opts.bulk === true;
		const tail = () =>
			Effects.make()
				.notify(trans(bulk ? "delete.notify.bulk_success" : "delete.notify.success"))
				.refreshTable();
		const name = opts.name ?? "delete";
		const builder = bulk
			? RecordAction.bulk(s, name, { using: using, tail })
			: RecordAction.server(s, name, { using: using, tail });
		return builder
			.label(trans(bulk ? "action.delete_selected" : "action.delete"))
			.color("danger")
			.confirm(
				trans(bulk ? "delete.confirm.bulk_title" : "delete.confirm.title"),
				trans("delete.confirm.body"),
			);
	},
};

/** Clone a record (ReplicateAction.php); no auto-redirect. */
export const ReplicateAction = {
	make(s: S, using: RecordFn, name = "replicate"): ActionBuilder {
		const tail = () => Effects.make().notify(trans("replicate.notify.success")).refreshTable();
		return RecordAction.server(s, name, { using: using, tail }).label(
			trans("action.replicate"),
		);
	},
};

/** Form footer: Save, or a Save/…/Cancel row (FormActions.php). */
export const FormActions = {
	save(s: S, label = "Save"): ActionBuilder {
		return s.action("save").label(label).color("primary").keybinding("mod+s").submit();
	},

	saveCancel(
		s: S,
		cancelUrl: string,
		opts: { saveLabel?: string; extra?: ActionBuilder[] } = {},
	) {
		return s.actionsRow([
			FormActions.save(s, opts.saveLabel),
			...(opts.extra ?? []),
			s.action("cancel").label("Cancel").url(cancelUrl),
		]);
	},
};
