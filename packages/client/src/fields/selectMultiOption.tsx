import { Combobox } from "@base-ui/react/combobox";

interface ComboboxOptionProps {
	value: string;
	label: string;
}

export function ComboboxOption({ value, label }: ComboboxOptionProps) {
	return (
		<Combobox.Item
			value={value}
			className="cursor-pointer rounded px-2 py-1.5 text-sm data-[highlighted]:bg-accent data-[selected]:font-medium"
		>
			{label}
		</Combobox.Item>
	);
}

export function matchesQuery(label: string, query: string): boolean {
	if (!query) {
		return true;
	}
	return label.toLowerCase().includes(query.toLowerCase());
}
