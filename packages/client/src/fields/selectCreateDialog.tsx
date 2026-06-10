import { type ReactNode, useState } from "react";
import { getBlockDescriptor } from "../render/blockRegistry";
import { invokeBlock, renderDescriptor } from "../render/renderDescriptor";
import { useClientActionContext } from "../structure/actionContext";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { isNodeDisabled, isNodeHidden } from "../structure/meta";
import type { ConditionContext, StructureNode } from "../structure/types";
import { Label } from "../ui/label";
import type { SelectCreateConfig } from "./selectShared";

type Bag = Record<string, unknown>;
type Ctrl = ReturnType<typeof useFormController>;

interface DialogProps {
	fieldName: string;
	config: SelectCreateConfig;
	onSuccess: (value: string, label: string) => void;
	onClose: () => void;
}

export function SelectCreateDialog({ fieldName, config, onSuccess, onClose }: DialogProps) {
	const ctx = useClientActionContext();
	const ctrl = useFormController({ initial: {} });
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
			if (errors !== null) {
				for (const [field, message] of Object.entries(errors)) {
					ctrl.setFieldError(field, message);
				}
			} else {
				setSubmitError(err instanceof Error ? err.message : "Create failed");
			}
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			data-testid="select-create-dialog"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		>
			<div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
				<FormControllerProvider value={ctrl}>
					<div className="flex flex-col gap-4">
						{config.fields.map((node, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: positional
							<div key={i}>{renderMiniField(node, ctrl)}</div>
						))}
						{submitError && <p className="text-sm text-destructive">{submitError}</p>}
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={onClose}
								disabled={submitting}
								className="rounded px-3 py-1.5 text-sm"
							>
								Cancel
							</button>
							<button
								type="button"
								data-testid="select-create-submit"
								onClick={handleSubmit}
								disabled={submitting}
								className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
							>
								{submitting ? "Creating…" : "Create"}
							</button>
						</div>
					</div>
				</FormControllerProvider>
			</div>
		</div>
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

function getErrors(err: unknown): Record<string, string> | null {
	if (err !== null && typeof err === "object" && "errors" in err) {
		const errors = (err as { errors: unknown }).errors;
		if (errors !== null && typeof errors === "object") {
			return errors as Record<string, string>;
		}
	}
	return null;
}
