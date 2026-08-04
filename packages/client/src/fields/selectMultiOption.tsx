import { Combobox } from "@base-ui/react/combobox";
import { SelectOptionContent } from "./selectOptionContent";
import type { StaticOption } from "./selectShared";

interface ComboboxOptionProps {
	option: StaticOption;
}

export function ComboboxOption({ option }: ComboboxOptionProps) {
	return (
		<Combobox.Item
			value={option.value}
			className="cursor-pointer rounded px-2 py-1.5 text-sm data-[highlighted]:bg-accent data-[selected]:font-medium"
		>
			<SelectOptionContent option={option} />
		</Combobox.Item>
	);
}

export function matchesQuery(label: string, query: string): boolean {
	if (!query) {
		return true;
	}
	return label.toLowerCase().includes(query.toLowerCase());
}
