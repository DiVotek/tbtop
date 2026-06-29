type PaletteHandler = () => void | Promise<void>;

const registry = new Map<string, PaletteHandler>();

/** Register a client handler invokable by a server-declared Command::handler(name). */
export function definePaletteCommand(name: string, handler: PaletteHandler): void {
	registry.set(name, handler);
}

export function getPaletteCommand(name: string): PaletteHandler | undefined {
	return registry.get(name);
}
