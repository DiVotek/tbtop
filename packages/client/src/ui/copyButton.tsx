import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "../i18n/i18n";
import { copyToClipboard } from "../lib/clipboard";
import { cn } from "../lib/cn";
import type { CopyableConfig } from "../structure/copyable";

interface CopyButtonProps {
	value: string;
	copyable: CopyableConfig;
	className?: string;
}

const DEFAULT_DURATION = 2000;

export function CopyButton({ value, copyable, className }: CopyButtonProps) {
	const t = useTranslation();
	const [copied, setCopied] = useState(false);
	const duration = copyable.duration ?? DEFAULT_DURATION;

	async function handleCopy() {
		if (!(await copyToClipboard(value))) {
			return;
		}
		setCopied(true);
		toast(copyable.message ?? t("field.copyable.copied"), { duration });
		window.setTimeout(() => setCopied(false), duration);
	}

	const Icon = copied ? CheckIcon : CopyIcon;
	return (
		<button
			type="button"
			aria-label={t("field.copyable.copy")}
			onClick={handleCopy}
			className={cn(
				"inline-flex items-center justify-center h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground",
				className,
			)}
		>
			<Icon className="h-4 w-4" aria-hidden />
		</button>
	);
}
