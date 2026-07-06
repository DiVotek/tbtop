/**
 * Field option types used by StructureBuilders. Extracted from structure.ts
 * to keep that file within the 200-line limit.
 */
import type { ReactNode } from "react";
import type { ClientActionContext } from "./types";

export type FieldName<TForm> = TForm extends object ? Extract<keyof TForm, string> : string;

export interface TextOpts {
	label?: string;
	required?: boolean;
	maxLength?: number;
}

export interface TextareaOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
	rows?: number;
	autoresize?: boolean;
}

export interface PasswordOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
	autoComplete?: "current-password" | "new-password" | "off";
}

export interface NumberOpts {
	label?: string;
	min?: number;
	max?: number;
	step?: number;
}

export interface OtpOpts {
	label?: string;
	required?: boolean;
	length?: number;
	pattern?: string;
}

export interface ChoiceOption {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
}

export interface DateOpts {
	label?: string;
	format?: string;
}

export interface DatetimeOpts {
	label?: string;
	required?: boolean;
	placeholder?: string;
}

type ErrorSlot = ReactNode | ((err: Error) => ReactNode);

export interface AsyncChoiceShared<TRow> {
	query: (ctx: ClientActionContext, search: string) => Promise<TRow[]>;
	optionLabel: (row: TRow) => string;
	optionValue: (row: TRow) => string;
	loading?: ReactNode;
	error?: ErrorSlot;
}

export interface AsyncChoiceSingle<TRow> extends AsyncChoiceShared<TRow> {
	onLoad?: (ctx: ClientActionContext, value: string) => Promise<TRow>;
}

export interface AsyncChoiceMulti<TRow> extends AsyncChoiceShared<TRow> {
	onLoad?: (ctx: ClientActionContext, values: string[]) => Promise<TRow[]>;
}

export interface SelectStaticSingleOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	multiple?: false;
}

export interface SelectStaticMultiOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	multiple: true;
}

export interface SelectAsyncSingleOpts<TRow> extends AsyncChoiceSingle<TRow> {
	label?: string;
	required?: boolean;
	multiple?: false;
}

export interface SelectAsyncMultiOpts<TRow> extends AsyncChoiceMulti<TRow> {
	label?: string;
	required?: boolean;
	multiple: true;
}

export type SelectOpts<TRow = unknown> =
	| SelectStaticSingleOpts
	| SelectStaticMultiOpts
	| SelectAsyncSingleOpts<TRow>
	| SelectAsyncMultiOpts<TRow>;

export interface RadioOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	inline?: boolean;
}

export interface CheckboxListOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
}

export interface ToggleButtonsOpts {
	label?: string;
	required?: boolean;
	options: ChoiceOption[];
	multiple?: boolean;
}

export interface SliderOpts {
	label?: string;
	required?: boolean;
	min?: number;
	max?: number;
	step?: number;
}

export interface TagsClosedOrOpenOpts {
	label?: string;
	required?: boolean;
	options?: ChoiceOption[];
}

export interface TagsAsyncOpts<TRow> extends AsyncChoiceMulti<TRow> {
	label?: string;
	required?: boolean;
}

export type TagsOpts<TRow = unknown> = TagsClosedOrOpenOpts | TagsAsyncOpts<TRow>;

export interface ColorpickerOpts {
	label?: string;
	required?: boolean;
	palette?: string[];
}

export interface KeyvalueOpts {
	label?: string;
	required?: boolean;
}

export interface SlugOpts {
	fromField: string;
	label?: string;
	required?: boolean;
}

export interface UploadOpts {
	label?: string;
	required?: boolean;
	entity?: string; // legacy preset ref
	profile?: string;
	disk?: string;
	directory?: string;
	visibility?: "public" | "private";
	accept?: string;
	maxSize?: number;
	maxFileSize?: number; // legacy alias
	image?: { convertTo?: "webp" | "jpeg" | "png"; quality?: number };
}

export interface RepeaterOpts<TBuilders = unknown> {
	fields: (s: TBuilders) => unknown[];
	label?: string;
	required?: boolean;
	minItems?: number;
	maxItems?: number;
}
