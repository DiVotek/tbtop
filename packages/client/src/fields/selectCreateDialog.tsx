import { type ReactNode, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { getBlockDescriptor } from "../render/blockRegistry";
import { invokeBlock, renderDescriptor } from "../render/renderDescriptor";
import { useClientActionContext } from "../structure/actionContext";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { isNodeDisabled, isNodeHidden } from "../structure/meta";
import type { ConditionContext, StructureNode } from "../structure/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ModalShell } from "../ui/modal-shell";
import type { SelectCreateConfig } from "./selectShared";

type Bag = Record<string, unknown>;
type Ctrl = ReturnType<typeof useFormController>;

interface DialogProps {
	fieldName: string;
	config: SelectCreateConfig;
	onSuccess: (value: string, label: string) => void;
	onClose: () => void;
}

export function SelectCreateDialog({
	fieldName: _fieldName,
	config,
	onSuccess,
	onClose,
}: DialogProps) {
	const ctx = useClientActionContext();
	const ctrl = useFormController({ initial: {} });
	const t = useTranslation();
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	async function handleSubmit() {
		setSubmitting(true);
		setSubmitError(null);
		try {
			const result = await config.post(ctx, ctrl.data);
			onSuccess(result.value, result.label);
		} catch (err: unknown) {
			const errors = getErrors(err);
			if (errors === null) {
				setSubmitError(err instanceof Error ? err.message : "Create failed");
				return;
			}
			applyFieldErrors(ctrl, errors);
		} finally {
			setSubmitting(false);
		}
	}

	const footer = (
		<>
			<Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
				{t("action.cancel")}
			</Button>
			<Button
				type="button"
				data-testid="select-create-submit"
				onClick={handleSubmit}
				disabled={submitting}
			>
				{submitting ? t("state.loading") : t("action.create")}
			</Button>
		</>
	);

	return (
		<ModalShell
			open={true}
			onOpenChange={(v) => !v && onClose()}
			title={t("action.create")}
			footer={footer}
			onlyDialog
			data-testid="select-create-dialog"
		>
			<FormControllerProvider value={ctrl}>
				<div className="flex flex-col gap-4">
					{config.fields.map((node, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: positional
						<div key={i}>{renderMiniField(node, ctrl)}</div>
					))}
					{submitError && <p className="text-sm text-destructive">{submitError}</p>}
				</div>
			</FormControllerProvider>
		</ModalShell>
	);
}

function renderMiniField(node: StructureNode, ctrl: Ctrl): ReactNode {
	const condCtx: ConditionContext = { record: undefined, data: ctrl.data, user: null };
	if (isNodeHidden(node.meta, condCtx)) {
		return null;
	}
	const disabled = isNodeDisabled(node.meta, condCtx);
	const descriptor = getBlockDescriptor(node.kind);
	const opts = mergeName(node);
	if (descriptor?.behavior === "field" && node.name) {
		const name = node.name;
		const label = (opts as { label?: string }).label;
		const required = (opts as { required?: boolean }).required === true;
		const fieldError = ctrl.fieldErrors[name];
		const control = renderDescriptor(descriptor, {
			kind: node.kind,
			options: opts,
			meta: node.meta,
			ctx: {
				surface: "form",
				binding: {
					name,
					value: ctrl.data[name] ?? null,
					onChange: (next) => ctrl.set(name, next),
					onBlur: () => ctrl.markTouched(name),
					disabled,
				},
			},
			children: undefined,
			renderChild: (child) => renderMiniField(child, ctrl),
		});
		return (
			<div className="flex flex-col gap-1.5">
				{label && (
					<Label htmlFor={name}>
						{label}
						{required && <span className="text-destructive">*</span>}
					</Label>
				)}
				{control}
				{fieldError && (
					<p className="text-sm text-destructive" data-testid={`field-error-${name}`}>
						{fieldError}
					</p>
				)}
			</div>
		);
	}
	return invokeBlock({
		kind: node.kind,
		options: opts,
		meta: node.meta,
		ctx: { surface: "form" },
		children: (opts as { children?: StructureNode[] }).children,
		renderChild: (child) => renderMiniField(child, ctrl),
	});
}

function mergeName(node: StructureNode): Bag {
	const opts = node.options as Bag;
	return node.name ? { ...opts, name: node.name } : opts;
}

function applyFieldErrors(ctrl: Ctrl, errors: Record<string, string>): void {
	for (const [field, message] of Object.entries(errors)) {
		ctrl.setFieldError(field, message);
	}
}

function getErrors(err: unknown): Record<string, string> | null {
	if (err !== null && typeof err === "object" && "errors" in err) {
		const errors = (err as { errors: unknown }).errors;
		if (errors !== null && typeof errors === "object") {
			return errors as Record<string, string>;
		}
	}
	return null;
}
