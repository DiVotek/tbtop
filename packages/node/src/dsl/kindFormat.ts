import { formatPhpDate } from "./phpDate";
import { isNumeric } from "./rules";

type Formatter = (value: unknown, meta: Record<string, unknown>) => unknown;

const DATE_FORMATS: Record<string, string> = {
	date: "Y-m-d",
	datetime: "Y-m-d H:i:s",
	time: "H:i",
};

const FORMATTERS: Record<string, Formatter> = {
	number: (value, meta) =>
		meta.decimals !== undefined && isNumeric(value)
			? numberFormat(Number(value), meta.decimals as number)
			: value,
	money: (value, meta) =>
		meta.currency !== undefined && isNumeric(value)
			? `${numberFormat(Number(value) / 100, 2)} ${String(meta.currency)}`
			: value,
};

/**
 * Server-side formatting shared by table cells and displayValue (KindFormat.php):
 * date/datetime/time/number/money bake a string, other kinds pass through.
 */
export function applyKindFormat(
	kind: string,
	meta: Record<string, unknown>,
	value: unknown,
): unknown {
	if (value === null || value === undefined || value === "") {
		return value;
	}
	const dateFormat = DATE_FORMATS[kind];
	if (dateFormat !== undefined) {
		return formatPhpDate(value, (meta.format as string | undefined) ?? dateFormat);
	}
	return FORMATTERS[kind]?.(value, meta) ?? value;
}

/** PHP number_format(): half away from zero, "," thousands, "." decimals. */
export function numberFormat(value: number, decimals: number): string {
	const factor = 10 ** decimals;
	const rounded = (Math.sign(value) * Math.round(Math.abs(value) * factor + 1e-9)) / factor;
	const [whole = "0", fraction] = Math.abs(rounded).toFixed(decimals).split(".");
	const grouped = whole.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ",");
	const sign = rounded < 0 ? "-" : "";
	return fraction === undefined ? `${sign}${grouped}` : `${sign}${grouped}.${fraction}`;
}
