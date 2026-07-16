import { InfoIcon } from "lucide-react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";
import type { FieldFormProps } from "../fields/fieldProps";
import { TranslatableWrapper } from "../fields/translatableWrapper";
import { type Translate, translateValidationMessage, useTranslation } from "../i18n/i18n";
import { getBlockDescriptor } from "../render/blockRegistry";
import { applyColumnPlacement } from "../render/columnPlacement";
import { invokeBlock, renderDescriptor } from "../render/renderDescriptor";
import { Label } from "../ui/label";
import { ConfirmDialog } from "../ui/modal-shell";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useClientActionContext } from "./actionContext";
import type { AsyncBlock } from "./asyncBlock";
import { ContentLocaleBar } from "./contentLocaleBar";
import {
	ActiveLocaleProvider,
	useActiveLocale,
	useContentLocaleConfig,
} from "./contentLocaleContext";
import { FormError, FormSkeleton } from "./defaults";
import { FormControllerProvider } from "./formContext";
import { isEqual, useFormController } from "./formController";
import { isNodeDisabled, isNodeHidden } from "./meta";
import { useModalData } from "./modalDataContext";
import { renderAsyncError } from "./renderAsyncError";
import { scrollToFirstError } from "./scrollToFirstError";
import type { ConditionContext, StructureNode } from "./types";
import { useAsyncQuery } from "./useAsyncQuery";
import { useUnsavedGuard } from "./useUnsavedGuard";

type Bag = Record<string, unknown>;
type ControllerHandle = ReturnType<typeof useFormController>;

interface FormBlockOptions extends Partial<AsyncBlock> {
	schema?: { parse: (input: unknown) => unknown };
	children?: StructureNode[];
	/** Show a confirm dialog when navigating away with unsaved changes. Defaults to true. */
	guardUnsaved?: boolean;
}

interface FormRenderProps {
	options: FormBlockOptions;
}

export function FormBlock({ options }: FormRenderProps) {
	const ctx = useClientActionContext();
	const modalData = useModalData();
	// Inside a data-modal the record comes from the modal's per-open fetch, not
	// the page-static query — skip the form's own query in that case.
	const hasModalData = modalData !== undefined;
	const { state } = useAsyncQuery({
		query: hasModalData ? undefined : options.query,
		ctx,
	});

	if (hasModalData) {
		return (
			<FormControllerBody
				initial={normalize(modalData)}
				schema={options.schema}
				guardUnsaved={options.guardUnsaved ?? true}
			>
				{options.children}
			</FormControllerBody>
		);
	}
	if (state.kind === "loading") {
		return <>{options.loading ?? <FormSkeleton />}</>;
	}
	if (state.kind === "error") {
		const fallback = <FormError message={state.message} />;
		return <>{renderAsyncError(options.error, state.message, fallback)}</>;
	}
	return (
		<FormControllerBody
			initial={normalize(state.data)}
			schema={options.schema}
			guardUnsaved={options.guardUnsaved ?? true}
		>
			{options.children}
		</FormControllerBody>
	);
}

interface BodyProps {
	initial: Bag;
	schema?: { parse: (input: unknown) => unknown };
	children: StructureNode[] | undefined;
	guardUnsaved: boolean;
}

function FormControllerBody({ initial, schema, children, guardUnsaved }: BodyProps) {
	const ctrl = useFormController({ initial, schema });
	const localeConfig = useContentLocaleConfig();
	const t = useTranslation();
	const formCtx: FormRenderCtx = { ctrl, locales: localeConfig.locales, t };
	useSyncInitial(initial, ctrl.reset);
	const guard = useUnsavedGuard(ctrl.isDirty, guardUnsaved);
	const hasTranslatable = detectTranslatableFields(children ?? []);
	const formRef = useRef<HTMLFormElement | null>(null);
	return (
		<FormControllerProvider value={ctrl}>
			<ActiveLocaleProvider defaultLocale={localeConfig.defaultLocale}>
				{hasTranslatable && (
					<ContentLocaleBar
						locales={localeConfig.locales}
						fieldErrors={ctrl.fieldErrors}
					/>
				)}
				<form
					ref={formRef}
					className="flex flex-col gap-4"
					data-testid="form-block"
					onSubmit={(e) => handleFormSubmit(e, formRef)}
				>
					<ScrollToErrorEffect
						errorScrollTick={ctrl.errorScrollTick}
						fieldErrors={ctrl.fieldErrors}
						formRef={formRef}
					/>
					{(children ?? []).map((child, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: structure children are positional
						<div key={i}>{renderFormChild(child, formCtx)}</div>
					))}
				</form>
			</ActiveLocaleProvider>
			<ConfirmDialog
				open={guard.pending !== null}
				onOpenChange={(open) => !open && guard.cancelLeave()}
				title={t("form.unsaved_guard.title")}
				body={t("form.unsaved_guard.body")}
				confirmLabel={t("form.unsaved_guard.leave")}
				cancelLabel={t("form.unsaved_guard.stay")}
				destructive
				onConfirm={guard.confirmLeave}
				data-testid="unsaved-guard-dialog"
			/>
		</FormControllerProvider>
	);
}

/**
 * Null-rendering component placed inside the <form> so it has access to
 * the ActiveLocaleCtx (which is provided by the parent ActiveLocaleProvider).
 * Watches errorScrollTick and calls scrollToFirstError when it increments.
 */
interface ScrollToErrorEffectProps {
	errorScrollTick: number;
	fieldErrors: Record<string, string>;
	formRef: RefObject<HTMLFormElement | null>;
}

function ScrollToErrorEffect({ errorScrollTick, fieldErrors, formRef }: ScrollToErrorEffectProps) {
	const localeCtx = useActiveLocale();
	const setActiveLocale = localeCtx ? localeCtx.setActive : null;
	const prevTickRef = useRef(0);

	useEffect(() => {
		if (errorScrollTick === 0 || errorScrollTick === prevTickRef.current) {
			return;
		}
		prevTickRef.current = errorScrollTick;
		scrollToFirstError(fieldErrors, formRef.current, setActiveLocale);
	}, [errorScrollTick, fieldErrors, formRef, setActiveLocale]);

	return null;
}

function handleFormSubmit(
	e: FormEvent<HTMLFormElement>,
	formRef: RefObject<HTMLFormElement | null>,
): void {
	e.preventDefault();
	// A button-originated submit already ran the handler via its own
	// click; only synthesize a click for keyboard/Enter submits.
	if (submitter(e)) {
		return;
	}
	formRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
}

/** The control that triggered the submit (a clicked button), or null for Enter. */
function submitter(e: FormEvent<HTMLFormElement>): HTMLElement | null {
	const native = e.nativeEvent;
	if (native instanceof SubmitEvent) {
		return native.submitter;
	}
	return null;
}

/**
 * Resync form state when the record VALUE changes. Identity alone is
 * not a signal: every Inertia props refresh (e.g. the redirect after a
 * failed submit) re-materializes the node and delivers a fresh, deep-
 * equal record — resetting then would wipe the user's edits and the
 * just-applied server field errors.
 */
function useSyncInitial(initial: Bag, reset: () => void): void {
	const prevRef = useRef(initial);
	useEffect(() => {
		if (isEqual(prevRef.current, initial)) {
			return;
		}
		prevRef.current = initial;
		reset();
	}, [initial, reset]);
}

/** Per-form values every recursive renderFormChild/renderFieldNode call needs. */
interface FormRenderCtx {
	ctrl: ControllerHandle;
	locales: string[];
	t: Translate;
}

function renderFormChild(node: StructureNode, formCtx: FormRenderCtx): ReactNode {
	const { ctrl } = formCtx;
	const condCtx: ConditionContext = { record: undefined, data: ctrl.data, user: null };
	if (isNodeHidden(node.meta, condCtx)) {
		return null;
	}
	const disabled = isNodeDisabled(node.meta, condCtx);
	const descriptor = getBlockDescriptor(node.kind);
	const options = mergeName(node);
	const rendered =
		descriptor?.behavior === "field" && node.name
			? renderFieldNode({ descriptor, node, options, disabled, formCtx })
			: invokeBlock({
					kind: node.kind,
					options,
					meta: node.meta,
					ctx: { surface: "form" },
					children: (options as { children?: StructureNode[] }).children,
					renderChild: (child) => renderFormChild(child, formCtx),
				});
	return applyColumnPlacement(rendered, options);
}

interface RenderFieldInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Bag;
	disabled: boolean;
	formCtx: FormRenderCtx;
}

function renderFieldNode(input: RenderFieldInput): ReactNode {
	const { descriptor, node, options, disabled, formCtx } = input;
	const { ctrl, t } = formCtx;
	const name = node.name as string;
	const fieldError = ctrl.fieldErrors[name];
	const label = (options as { label?: string }).label;
	const required = (options as { required?: boolean }).required === true;
	const helperText = (options as { helperText?: string }).helperText;
	const tooltip = (options as { tooltip?: string }).tooltip;
	const fieldId = node.meta.id ?? name;
	const isTranslatable = (options as { translatable?: boolean }).translatable === true;

	const control = isTranslatable
		? renderTranslatableField({
				descriptor,
				node,
				options,
				name,
				fieldId,
				disabled,
				formCtx,
			})
		: renderDescriptor(descriptor, {
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
							revalidateField(ctrl, name, t);
						},
						disabled,
					},
				},
				children: undefined,
				renderChild: (child) => renderFormChild(child, formCtx),
			});

	const labelNode = label && (
		<Label htmlFor={fieldId}>
			{label}
			{required && <span className="text-destructive">*</span>}
			{tooltip && <FieldTooltip text={tooltip} />}
		</Label>
	);

	// Checkbox is a control-first, inline-label layout (control left, label
	// right, one row) — not the label-above-control stack every other field
	// kind uses. Other choice fields (boolean/switch, radio, etc.) keep the
	// default stack; only checkbox needs this treatment.
	if (node.kind === "checkbox") {
		return (
			<div className="flex flex-col gap-1.5" data-field-name={name}>
				<div className="flex items-center gap-2">
					{control}
					{labelNode}
				</div>
				{helperText && <FieldHelperText text={helperText} />}
				{fieldError && <FieldError name={name} message={fieldError} />}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5" data-field-name={name}>
			{labelNode}
			{control}
			{helperText && <FieldHelperText text={helperText} />}
			{fieldError && <FieldError name={name} message={fieldError} />}
		</div>
	);
}

interface TranslatableFieldInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Bag;
	name: string;
	fieldId: string;
	disabled: boolean;
	formCtx: FormRenderCtx;
}

function renderTranslatableField(input: TranslatableFieldInput): ReactNode {
	const { descriptor, node, options, name, fieldId, disabled, formCtx } = input;
	const { ctrl, locales } = formCtx;
	// Strip name + translatable before forwarding to the wrapper — the wrapper
	// derives per-locale names itself and must not see the parent field name.
	const {
		name: _n,
		translatable: _translatable,
		...innerOptions
	} = options as Bag & {
		name?: string;
		translatable?: boolean;
	};
	const renderInner = makeInnerRenderer({
		descriptor,
		node,
		options: innerOptions,
		disabled,
		formCtx,
	});
	const value = normalizeTranslatableValue(ctrl.data[name], locales);
	return (
		<TranslatableWrapper
			name={name}
			id={fieldId}
			value={value}
			onChange={(next) => ctrl.set(name, next)}
			onBlur={() => {
				ctrl.markTouched(name);
			}}
			options={innerOptions}
			renderInner={renderInner}
			locales={locales}
		/>
	);
}

type MakeInnerRendererInput = {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Bag;
	disabled: boolean;
	formCtx: FormRenderCtx;
};

/**
 * Builds a render FUNCTION (invoked, never mounted) that delegates to the
 * descriptor's field component. Must not return a component type: a fresh
 * component identity per render makes React remount the input on every
 * keystroke, dropping focus. Caller strips name/translatable from options.
 */
function makeInnerRenderer({
	descriptor,
	node,
	options,
	disabled,
	formCtx,
}: MakeInnerRendererInput): (props: FieldFormProps<unknown>) => ReactNode {
	return (props: FieldFormProps<unknown>) =>
		renderDescriptor(descriptor, {
			kind: node.kind,
			options: { ...options, ...props.options },
			meta: node.meta,
			ctx: {
				surface: "form",
				binding: {
					name: props.name,
					value: props.value,
					onChange: props.onChange,
					onBlur: props.onBlur,
					disabled,
				},
			},
			children: undefined,
			renderChild: (child) => renderFormChild(child, formCtx),
		}) as ReactNode;
}

/**
 * Normalise a stored value to a locale map. Handles legacy: if the stored
 * value is a non-object (string/number/boolean), initialise the default locale
 * with that value and other locales as null.
 */
function normalizeTranslatableValue(raw: unknown, locales: string[]): Record<string, unknown> {
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}
	const defaultLocale = locales[0] ?? "en";
	const map: Record<string, unknown> = {};
	for (const locale of locales) {
		map[locale] = null;
	}
	if (raw !== null && raw !== undefined && typeof raw !== "object") {
		map[defaultLocale] = raw;
	}
	return map;
}

export function revalidateField(ctrl: ControllerHandle, name: string, t: Translate): void {
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
		ctrl.setFieldError(name, match ? translateValidationMessage(t, match.message) : null);
	}
}

function FieldError({ name, message }: { name: string; message: string }) {
	return (
		<p role="alert" className="text-sm text-destructive" data-testid={`field-error-${name}`}>
			{message}
		</p>
	);
}

function FieldHelperText({ text }: { text: string }) {
	return (
		<p className="text-sm text-muted-foreground" data-testid="field-helper-text">
			{text}
		</p>
	);
}

function FieldTooltip({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger
				type="button"
				aria-label={text}
				className="inline-flex items-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<InfoIcon className="size-3.5" aria-hidden />
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
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

/** Recursively checks whether any field node in the tree has translatable:true. */
function detectTranslatableFields(children: StructureNode[]): boolean {
	for (const node of children) {
		const opts = node.options as Bag | undefined;
		if (opts?.translatable === true) {
			return true;
		}
		const nested = (opts?.children ?? opts?.fields) as StructureNode[] | undefined;
		if (nested && detectTranslatableFields(nested)) {
			return true;
		}
	}
	return false;
}
