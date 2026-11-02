import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import { useTranslation } from "../i18n/i18n";
import { nullableCell } from "./cellHelpers";
import { groupLabelledBy } from "./fieldChrome";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

interface ColorpickerOptionsBag {
	label?: string;
	palette?: string[];
}

const HEX_ALPHA_LENGTH = 9;

function hasAlpha(value: string | null | undefined): boolean {
	return typeof value === "string" && value.length === HEX_ALPHA_LENGTH;
}

export function ColorpickerCell({ value }: FieldCellProps<string>) {
	return nullableCell(value, (v) =>
		v === "" ? null : (
			<span className="inline-flex items-center gap-2">
				<span
					aria-hidden
					className="inline-block h-4 w-4 rounded border border-border"
					style={{ backgroundColor: v }}
				/>
				<span className="font-mono text-xs">{v}</span>
			</span>
		),
	);
}

export function ColorpickerForm({
	id,
	name,
	value,
	onChange,
	disabled,
	describedBy,
	options,
}: FieldFormProps<string, ColorpickerOptionsBag>) {
	const t = useTranslation();
	const current = asString(value);
	const Picker = hasAlpha(current) ? HexAlphaColorPicker : HexColorPicker;
	const palette = options?.palette ?? [];
	return (
		<div
			role="group"
			aria-labelledby={groupLabelledBy(fieldId({ id, name }), options?.label)}
			aria-describedby={describedBy}
			data-field={name}
			className="flex flex-col gap-3"
		>
			<Picker
				color={current}
				onChange={(next) => (disabled ? undefined : onChange(next === "" ? null : next))}
			/>
			{palette.length > 0 ? (
				<div
					role="listbox"
					aria-label={t("field.colorpicker.palette")}
					className="flex flex-wrap gap-1"
				>
					{palette.map((swatch) => (
						<button
							key={swatch}
							type="button"
							role="option"
							aria-selected={current.toLowerCase() === swatch.toLowerCase()}
							aria-label={swatch}
							disabled={disabled}
							onClick={() => onChange(swatch)}
							className="h-6 w-6 rounded border border-border"
							style={{ backgroundColor: swatch }}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
