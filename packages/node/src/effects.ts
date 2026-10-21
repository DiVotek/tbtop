/** The closed effect vocabulary (Actions/Effects.php), same wire shape. */
export type Effect =
	| { kind: "notify"; message: string; level: string }
	| { kind: "redirect"; href: string }
	| { kind: "refreshTable"; table?: string }
	| { kind: "resetForm"; form?: string }
	| { kind: "closeModal" }
	| { kind: "setFormData"; data: Record<string, unknown> }
	| { kind: "haltModal"; message: string; level: string }
	| { kind: "copyToClipboard"; text: string };

export class Effects {
	private readonly list: Effect[] = [];

	static make(): Effects {
		return new Effects();
	}

	notify(message: string, level: "success" | "info" | "warning" | "error" = "success"): this {
		return this.push({ kind: "notify", message, level });
	}

	redirect(href: string): this {
		return this.push({ kind: "redirect", href });
	}

	refreshTable(table?: string): this {
		return this.push(
			table === undefined ? { kind: "refreshTable" } : { kind: "refreshTable", table },
		);
	}

	resetForm(form?: string): this {
		return this.push(form === undefined ? { kind: "resetForm" } : { kind: "resetForm", form });
	}

	closeModal(): this {
		return this.push({ kind: "closeModal" });
	}

	setFormData(data: Record<string, unknown>): this {
		return this.push({ kind: "setFormData", data });
	}

	haltModal(message: string, level = "error"): this {
		return this.push({ kind: "haltModal", message, level });
	}

	copyToClipboard(text: string): this {
		return this.push({ kind: "copyToClipboard", text });
	}

	toJSON(): Effect[] {
		return [...this.list];
	}

	private push(effect: Effect): this {
		this.list.push(effect);
		return this;
	}
}

export const effects = Effects.make;
