import { LanguagesIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useLocale } from "./i18n";

export function LanguageSwitcher() {
	const { locale, setLocale, available } = useLocale();
	if (available.length < 2) {
		return null;
	}
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					aria-label="Change language"
					data-testid="language-switcher"
				>
					<LanguagesIcon className="size-4" />
					<span className="ml-2 text-sm uppercase">{locale}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-48 p-1">
				<ul className="flex flex-col">
					{available.map((code) => (
						<li key={code}>
							<button
								type="button"
								onClick={() => setLocale(code)}
								data-active={code === locale}
								className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent data-[active=true]:font-medium"
							>
								<span>{displayName(code)}</span>
								<span className="text-xs text-muted-foreground uppercase">
									{code}
								</span>
							</button>
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

function displayName(code: string): string {
	try {
		const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
		return name ?? code;
	} catch {
		return code;
	}
}
