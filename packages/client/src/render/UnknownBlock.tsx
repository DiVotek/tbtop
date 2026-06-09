export function UnknownBlock({ kind }: { kind: string }) {
	return (
		<code className="text-xs text-destructive" data-testid="unknown-block">
			{`<unknown block: ${kind}>`}
		</code>
	);
}
