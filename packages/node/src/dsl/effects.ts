/** One client effect; the closed vocabulary of Actions/Effects.php. */
export type Effect =
	| { kind: "notify"; message: string; level: string }
	| { kind: "redirect"; href: string }
	| { kind: "refreshTable"; table?: string }
	| { kind: "resetForm"; form?: string }
	| { kind: "closeModal" }
	| { kind: "setFormData"; data: Record<string, unknown> }
	| { kind: "haltModal"; message: string; level: string }
	| { kind: "copyToClipboard"; text: string };

/** Effects the client runs after an action, in call order. Growing the set is a contract bump. */
export class Effects {
	private readonly list: Effect[] = [];

	static make(): Effects {
		return new Effects();
	}

	/** Toast; only 'error' and 'warning' style differently, the rest render as success. */
	notify(message: string, level = "success"): this {
		return this.push({ kind: "notify", message, level });
	}

	/** Client-side navigation through the router. */
	redirect(href: string): this {
		return this.push({ kind: "redirect", href });
	}

	/** Refetch the named table; without a name, the enclosing table or every table. */
	refreshTable(table?: string): this {
		return this.push(table ? { kind: "refreshTable", table } : { kind: "refreshTable" });
	}

	/** Reset the nearest enclosing form. */
	resetForm(form?: string): this {
		return this.push(form ? { kind: "resetForm", form } : { kind: "resetForm" });
	}

	/** Close the modal the action ran in. */
	closeModal(): this {
		return this.push({ kind: "closeModal" });
	}

	/** Replace keys in the nearest enclosing form, leaving it dirty. */
	setFormData(data: Record<string, unknown>): this {
		return this.push({ kind: "setFormData", data });
	}

	/** Show a message inside the still-open modal without closing it. */
	haltModal(message: string, level = "error"): this {
		return this.push({ kind: "haltModal", message, level });
	}

	/** Write text to the clipboard and toast. */
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
