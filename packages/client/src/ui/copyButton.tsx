import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "../i18n/i18n";
import { copyToClipboard } from "../lib/clipboard";
import { cn } from "../lib/cn";
import type { CopyableConfig } from "../structure/copyable";
import { Button } from "./button";

interface CopyButtonProps {
	value: string;
	copyable: CopyableConfig;
	className?: string;
}

const DEFAULT_DURATION = 2000;

export function CopyButton({ value, copyable, className }: CopyButtonProps) {
	const t = useTranslation();
	const [copied, setCopied] = useState(false);
	const timer = useRef<number | null>(null);
	const duration = copyable.duration ?? DEFAULT_DURATION;

	useEffect(() => {
		return () => {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
			}
		};
	}, []);

	async function handleCopy() {
		if (!(await copyToClipboard(value))) {
			return;
		}
		setCopied(true);
		toast(copyable.message ?? t("field.copyable.copied"), { duration });
		if (timer.current !== null) {
			window.clearTimeout(timer.current);
		}
		timer.current = window.setTimeout(() => setCopied(false), duration);
	}

	const Icon = copied ? CheckIcon : CopyIcon;
	return (
		<Button
			variant="ghost"
			size="icon-xs"
			aria-label={t("field.copyable.copy")}
			onClick={handleCopy}
			className={cn("text-muted-foreground hover:text-foreground", className)}
		>
			<Icon className="size-4" aria-hidden />
		</Button>
	);
}
