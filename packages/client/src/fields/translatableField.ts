import { createElement, type ReactNode } from "react";
import { getBlockDescriptor } from "../render/blockRegistry";
import { renderDescriptor } from "../render/renderDescriptor";
import type { StructureNode } from "../structure/structure";
import type { FieldFormProps } from "./fieldProps";
import { TranslatableWrapper } from "./translatableWrapper";

type Bag = Record<string, unknown>;

/**
 * Normalise a stored value to a locale map. Handles legacy: if the stored
 * value is a non-object (string/number/boolean), initialise the default locale
 * with that value and other locales as null.
 */
export function normalizeTranslatableValue(
	raw: unknown,
	locales: string[],
): Record<string, unknown> {
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

export interface RenderTranslatableFieldInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	/** Field options with `name`/`translatable` already stripped by the caller. */
	innerOptions: Bag;
	name: string;
	fieldId?: string;
	value: unknown;
	onChange: (next: unknown) => void;
	onBlur?: () => void;
	disabled: boolean;
	locales: string[];
	/** How to render a descriptor's declared children, if any (form-level only; repeater subfields have none). */
	renderChild?: (child: StructureNode) => ReactNode;
}

/**
 * Shared translatable-field rendering: builds the per-locale renderInner
 * function and wraps it in TranslatableWrapper. Used by both the top-level
 * form (formBlock.renderFieldNode) and repeater sub-fields (repeaterRow),
 * so translatable behaves identically at any nesting depth.
 */
export function renderTranslatableField(input: RenderTranslatableFieldInput): ReactNode {
	const {
		descriptor,
		node,
		innerOptions,
		name,
		fieldId,
		value,
		onChange,
		onBlur,
		disabled,
		locales,
		renderChild,
	} = input;
	const renderInner = makeInnerRenderer({
		descriptor,
		node,
		options: innerOptions,
		disabled,
		renderChild,
	});
	const normalized = normalizeTranslatableValue(value, locales);
	return createElement(TranslatableWrapper, {
		name,
		id: fieldId,
		value: normalized,
		onChange,
		onBlur,
		options: innerOptions,
		renderInner,
		locales,
	});
}

interface MakeInnerRendererInput {
	descriptor: NonNullable<ReturnType<typeof getBlockDescriptor>>;
	node: StructureNode;
	options: Bag;
	disabled: boolean;
	renderChild?: (child: StructureNode) => ReactNode;
}

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
	renderChild,
}: MakeInnerRendererInput): (props: FieldFormProps<unknown>) => ReactNode {
	const childRenderer = renderChild ?? (() => null);
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
			renderChild: childRenderer,
		}) as ReactNode;
}
