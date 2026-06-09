import type { RenderProps } from "../render/blockRegistry";

interface HeadingOptions {
	text: string;
	level: 2 | 3 | 4;
}

interface DescriptionOptions {
	text: string;
}

export function DividerBlock() {
	return <hr className="border-t border-border" data-testid="divider-block" />;
}

export function HeadingBlock({ options }: RenderProps<HeadingOptions>) {
	if (options.level === 2) {
		return <h2 className="text-xl font-semibold">{options.text}</h2>;
	}
	if (options.level === 4) {
		return <h4 className="text-sm font-semibold">{options.text}</h4>;
	}
	return <h3 className="text-base font-semibold">{options.text}</h3>;
}

export function DescriptionBlock({ options }: RenderProps<DescriptionOptions>) {
	return <p className="text-sm text-muted-foreground">{options.text}</p>;
}
