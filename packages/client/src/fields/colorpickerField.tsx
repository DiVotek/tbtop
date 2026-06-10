import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

interface ColorpickerOptionsBag {
	palette?: string[];
}

const HEX_ALPHA_LENGTH = 9;

function hasAlpha(value: string | null | undefined): boolean {
	return typeof value === "string" && value.length === HEX_ALPHA_LENGTH;
}

export function ColorpickerCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	return (
		<span className="inline-flex items-center gap-2">
			<span
				aria-hidden
				className="inline-block h-4 w-4 rounded border border-border"
				style={{ backgroundColor: value }}
			/>
			<span className="font-mono text-xs">{value}</span>
		</span>
	);
}

export function ColorpickerForm({
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<string, ColorpickerOptionsBag>) {
	const current = typeof value === "string" ? value : "";
	const Picker = hasAlpha(current) ? HexAlphaColorPicker : HexColorPicker;
	const palette = options?.palette ?? [];
	return (
		<div data-field={name} className="flex flex-col gap-3">
			<Picker
				color={current}
				onChange={(next) => (disabled ? undefined : onChange(next === "" ? null : next))}
			/>
			{palette.length > 0 ? (
				<div role="listbox" aria-label="Color palette" className="flex flex-wrap gap-1">
					{palette.map((swatch) => (
						<button
							key={swatch}
							type="button"
							role="option"
							aria-selected={current === swatch}
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
