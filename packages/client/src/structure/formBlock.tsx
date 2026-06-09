import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { getBlockDescriptor } from "../render/blockRegistry";
import { invokeBlock, renderDescriptor } from "../render/renderDescriptor";
import { Label } from "../ui/label";
import { useClientActionContext } from "./actionContext";
import type { AsyncBlock } from "./asyncBlock";
import { FormError, FormSkeleton } from "./defaults";
import { FormControllerProvider } from "./formContext";
import { useFormController } from "./formController";
import { isNodeHidden } from "./meta";
import { renderAsyncError } from "./renderAsyncError";
import type { ConditionContext, StructureNode } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";

type Bag = Record<string, unknown>;
type ControllerHandle = ReturnType<typeof useFormController>;

interface FormBlockOptions extends Partial<AsyncBlock> {
	schema?: { parse: (input: unknown) => unknown };
	children?: StructureNode[];
}

interface FormRenderProps {
	options: FormBlockOptions;
}

export function FormBlock({ options }: FormRenderProps) {
	const ctx = useClientActionContext();
	const { state } = useAsyncQuery({ query: options.query, ctx });

	if (state.kind === "loading") {
		return <>{options.loading ?? <FormSkeleton />}</>;
	}
	if (state.kind === "error") {
		const fallback = <FormError message={state.message} />;
		return <>{renderAsyncError(options.error, state.message, fallback)}</>;
	}
	return (
		<FormControllerBody initial={normalize(state.data)} schema={options.schema}>
			{options.children}
		</FormControllerBody>
	);
}

interface BodyProps {
	initial: Bag;
	schema?: { parse: (input: unknown) => unknown };
	children: StructureNode[] | undefined;
}

function FormControllerBody({ initial, schema, children }: BodyProps) {
	const ctrl = useFormController({ initial, schema });
	useSyncInitial(initial, ctrl.reset);
	return (
		<FormControllerProvider value={ctrl}>
			<form className="flex flex-col gap-4" data-testid="form-block">
				{(children ?? []).map((child, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: structure children are positional
					<div key={i}>{renderFormChild(child, ctrl)}</div>
				))}
			</form>
		</FormControllerProvider>
	);
}

function useSyncInitial(initial: Bag, reset: () => void): void {
	const prevRef = useRef(initial);
	useEffect(() => {
		if (prevRef.current === initial) {
			return;
		}
		prevRef.current = initial;
		reset();
	}, [initial, reset]);
}

function renderFormChild(node: StructureNode, ctrl: ControllerHandle): ReactNode {
	const condCtx: ConditionContext = { record: undefined, data: ctrl.data, user: null };
	if (isNodeHidden(node.meta, condCtx)) {
		return null;
	}
	const descriptor = getBlockDescriptor(node.kind);
	const options = mergeName(node);
	if (descriptor?.behavior === "field" && node.name) {
		return renderFieldNode({ descriptor, node, options, ctrl });
	}
	return invokeBlock({
		kind: node.kind,
		options,
		meta: node.meta,
		ctx: { surface: "form" },
		children: (options as { children?: StructureNode[] }).children,
		renderChild: (child) => renderFormChild(child, ctrl),
	});
}

interface RenderFieldInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Bag;
	ctrl: ControllerHandle;
}

function renderFieldNode(input: RenderFieldInput): ReactNode {
	const { descriptor, node, options, ctrl } = input;
	const name = node.name as string;
	const fieldError = ctrl.fieldErrors[name];
	const label = (options as { label?: string }).label;
	const required = (options as { required?: boolean }).required === true;
	const fieldId = node.meta.id ?? name;
	const control = renderDescriptor(descriptor, {
		kind: node.kind,
		options,
		meta: node.meta,
		ctx: {
			surface: "form",
			binding: {
				name,
				value: ctrl.data[name],
				onChange: (next) => ctrl.set(name, next),
				onBlur: () => {
					ctrl.markTouched(name);
					revalidateField(ctrl, name);
				},
			},
		},
		children: undefined,
		renderChild: (child) => renderFormChild(child, ctrl),
	});
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<Label htmlFor={fieldId}>
					{label}
					{required && <span className="text-destructive">*</span>}
				</Label>
			)}
			{control}
			{fieldError && <FieldError name={name} message={fieldError} />}
		</div>
	);
}

export function revalidateField(ctrl: ControllerHandle, name: string): void {
	if (!ctrl.schema) {
		return;
	}
	const isChanged = ctrl.changedFields.includes(name);
	if (!isChanged) {
		return;
	}
	try {
		ctrl.schema.parse(ctrl.data);
		ctrl.setFieldError(name, null);
	} catch (err) {
		const issues = (err as { issues?: { path: (string | number)[]; message: string }[] })
			.issues;
		if (!Array.isArray(issues)) {
			return;
		}
		const match = issues.find((i) => i.path[0] === name);
		ctrl.setFieldError(name, match ? match.message : null);
	}
}

function FieldError({ name, message }: { name: string; message: string }) {
	return (
		<p role="alert" className="text-sm text-destructive" data-testid={`field-error-${name}`}>
			{message}
		</p>
	);
}

function mergeName(node: StructureNode): Bag {
	const baseOptions = node.options as Bag;
	return node.name ? { name: node.name, ...baseOptions } : baseOptions;
}

function normalize(data: unknown): Bag {
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const obj = data as Bag;
		if ("data" in obj && typeof obj.data === "object" && obj.data !== null) {
			return obj.data as Bag;
		}
		return obj;
	}
	return {};
}
