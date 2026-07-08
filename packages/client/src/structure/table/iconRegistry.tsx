/**
 * Icon registry for table cell renderers.
 *
 * A small set of Lucide icons are built-in; additional icons (or overrides)
 * can be registered at startup via registerTableIcon().
 */
import type { LucideIcon } from "lucide-react";
import {
	AlertCircle,
	Archive,
	Bell,
	Check,
	Circle,
	Clock,
	ExternalLink,
	Eye,
	EyeOff,
	FileText,
	Globe,
	Inbox,
	Lock,
	Mail,
	Pencil,
	Star,
	Trash,
	User,
	X,
} from "lucide-react";

const builtins: Record<string, LucideIcon> = {
	check: Check,
	x: X,
	pencil: Pencil,
	trash: Trash,
	eye: Eye,
	"eye-off": EyeOff,
	star: Star,
	globe: Globe,
	lock: Lock,
	clock: Clock,
	archive: Archive,
	circle: Circle,
	"file-text": FileText,
	"alert-circle": AlertCircle,
	inbox: Inbox,
	mail: Mail,
	bell: Bell,
	user: User,
	"external-link": ExternalLink,
};

const custom: Record<string, LucideIcon> = {};

export function registerIcon(name: string, Icon: LucideIcon): void {
	custom[name] = Icon;
}

/** @deprecated Use {@link registerIcon} instead. */
export const registerTableIcon = registerIcon;

export function resolveIcon(name: string | undefined): LucideIcon | undefined {
	if (!name) {
		return undefined;
	}
	return custom[name] ?? builtins[name];
}
