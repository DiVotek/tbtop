import { type ComponentType, createElement } from "react";
import type { FieldCellProps, FieldFormProps } from "../fields/fieldProps";
import type { BlockDescriptor, FieldBinding, RenderProps } from "./blockRegistry";
import { defineBlock } from "./defineBlock";

export interface FieldClientDescriptor<P = unknown> {
	form: ComponentType<FieldFormProps<P>>;
	cell: ComponentType<FieldCellProps<P>>;
	defaultOptions?: P;
}

const NOOP_CHANGE = () => {};

export function defineFieldClient<T extends string, P>(
	type: T,
	descriptor: FieldClientDescriptor<P>,
): BlockDescriptor<T, P> {
	const FieldRender = makeFieldRender<P>(descriptor.form, descriptor.cell);
	return defineBlock<T, P>(type, {
		behavior: "field",
		render: FieldRender,
		defaultOptions: descriptor.defaultOptions as Partial<P> | undefined,
	});
}

function makeFieldRender<P>(
	Form: ComponentType<FieldFormProps<P>>,
	Cell: ComponentType<FieldCellProps<P>>,
): ComponentType<RenderProps<P>> {
	return function FieldRender(props: RenderProps<P>) {
		if (props.ctx.surface === "cell") {
			return createElement(Cell, cellPropsFrom<P>(props));
		}
		return createElement(Form, formPropsFrom<P>(props));
	};
}

function cellPropsFrom<P>(props: RenderProps<P>): FieldCellProps<P> {
	const binding = readBinding<P>(props);
	return {
		value: binding.value as P | null,
		options: props.options as unknown as Record<string, unknown>,
	};
}

function formPropsFrom<P>(props: RenderProps<P>): FieldFormProps<P> {
	const binding = readBinding<P>(props);
	const name = (props.options as { name?: string } | undefined)?.name ?? binding.name;
	return {
		id: props.meta.id ?? name,
		name,
		value: binding.value as P | null,
		onChange: binding.onChange,
		onBlur: binding.onBlur,
		disabled: binding.disabled,
		options: props.options as unknown as Record<string, unknown>,
	};
}

function readBinding<P>(props: RenderProps<P>): FieldBinding {
	if (props.ctx.binding) {
		return props.ctx.binding;
	}
	const name = (props.options as { name?: string } | undefined)?.name ?? "";
	return { name, value: null, onChange: NOOP_CHANGE };
}
