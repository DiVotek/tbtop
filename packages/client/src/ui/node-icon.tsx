import { resolveIcon } from "../structure/table/iconRegistry";

export interface IconDef {
	name: string;
	position?: string;
}

export function NodeIcon({
	icon,
	className = "size-4 shrink-0",
}: {
	icon: IconDef | undefined;
	className?: string;
}) {
	if (!icon) {
		return null;
	}
	const Icon = resolveIcon(icon.name);
	if (!Icon) {
		return null;
	}
	return <Icon className={className} aria-hidden />;
}
