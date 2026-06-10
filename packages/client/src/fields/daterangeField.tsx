import { Input } from "../ui/input";
import type { FieldFormProps } from "./fieldProps";

export type DaterangeValue = { from?: string | null; to?: string | null } | null;

export function DaterangeForm({ name, value, onChange, disabled }: FieldFormProps<DaterangeValue>) {
	const current = value ?? {};
	const fromValue = current.from ?? "";
	const toValue = current.to ?? "";

	function handleFrom(raw: string): void {
		onChange({ from: raw === "" ? null : raw, to: current.to ?? null });
	}

	function handleTo(raw: string): void {
		onChange({ from: current.from ?? null, to: raw === "" ? null : raw });
	}

	return (
		<div className="flex items-center gap-2">
			<Input
				type="date"
				name={`${name}[from]`}
				value={fromValue}
				disabled={disabled}
				data-testid="daterange-from"
				onChange={(e) => handleFrom(e.target.value)}
			/>
			<span className="text-muted-foreground">–</span>
			<Input
				type="date"
				name={`${name}[to]`}
				value={toValue}
				disabled={disabled}
				data-testid="daterange-to"
				onChange={(e) => handleTo(e.target.value)}
			/>
		</div>
	);
}
