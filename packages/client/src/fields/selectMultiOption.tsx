import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon } from "lucide-react";
import { SelectOptionContent } from "./selectOptionContent";
import type { StaticOption } from "./selectShared";

interface ComboboxOptionProps {
	option: StaticOption;
	testId?: string;
}

export function ComboboxOption({ option, testId }: ComboboxOptionProps) {
	return (
		<Combobox.Item
			value={option.value}
			data-testid={testId}
			className="relative cursor-pointer rounded py-1.5 pr-8 pl-2 text-sm data-[highlighted]:bg-accent data-[selected]:font-medium"
		>
			<SelectOptionContent option={option} />
			<Combobox.ItemIndicator className="absolute top-0 right-2 flex h-full items-center">
				<CheckIcon className="size-4" />
			</Combobox.ItemIndicator>
		</Combobox.Item>
	);
}

export function matchesQuery(label: string, query: string): boolean {
	if (!query) {
		return true;
	}
	return label.toLowerCase().includes(query.toLowerCase());
}
