type RuleSink = { rules(rules: string | string[]): unknown };

function chain<T>(field: T, rule: string): T {
	(field as unknown as RuleSink).rules(rule);
	return field;
}

/** Rules every field takes (HasGenericRules.php): all server-only. */
export class GenericRules {
	/** Value may be null/empty (skips other rules when absent). */
	nullable(): this {
		return chain(this, "nullable");
	}

	/** Value must equal another field's value (e.g. password match). */
	same(field: string): this {
		return chain(this, `same:${field}`);
	}

	/** Value must differ from another field's value. */
	different(field: string): this {
		return chain(this, `different:${field}`);
	}

	/** Requires a sibling "{name}_confirmation" field to match. */
	confirmed(): this {
		return chain(this, "confirmed");
	}

	/** Required only when any listed field is present. */
	requiredWith(...fields: string[]): this {
		return chain(this, `required_with:${fields.join(",")}`);
	}

	/** Required only when any listed field is absent. */
	requiredWithout(...fields: string[]): this {
		return chain(this, `required_without:${fields.join(",")}`);
	}

	/** Value must be one of the allowed set. */
	in(values: (string | number)[]): this {
		return chain(this, `in:${values.join(",")}`);
	}

	/** Value must NOT be one of the listed set. */
	notIn(values: (string | number)[]): this {
		return chain(this, `not_in:${values.join(",")}`);
	}
}
