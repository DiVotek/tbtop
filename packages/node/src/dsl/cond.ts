export type CondOp =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "in"
	| "not in"
	| "empty"
	| "not empty"
	| "truthy";

/** A serializable condition AST node; JSON is the locked wire shape (Cond.php). */
export class Cond {
	private constructor(private readonly data: Record<string, unknown>) {}

	static eq(field: string, value: unknown): Cond {
		return new Cond({ op: "eq", field, value });
	}

	static neq(field: string, value: unknown): Cond {
		return new Cond({ op: "neq", field, value });
	}

	static in(field: string, value: unknown[]): Cond {
		return new Cond({ op: "in", field, value });
	}

	static notIn(field: string, value: unknown[]): Cond {
		return new Cond({ op: "notIn", field, value });
	}

	static empty(field: string): Cond {
		return new Cond({ op: "empty", field });
	}

	static notEmpty(field: string): Cond {
		return new Cond({ op: "notEmpty", field });
	}

	static truthy(field: string): Cond {
		return new Cond({ op: "truthy", field });
	}

	static gt(field: string, value: unknown): Cond {
		return new Cond({ op: "gt", field, value });
	}

	static gte(field: string, value: unknown): Cond {
		return new Cond({ op: "gte", field, value });
	}

	static lt(field: string, value: unknown): Cond {
		return new Cond({ op: "lt", field, value });
	}

	static lte(field: string, value: unknown): Cond {
		return new Cond({ op: "lte", field, value });
	}

	static all(...conds: Cond[]): Cond {
		return new Cond({ op: "all", conds });
	}

	static any(...conds: Cond[]): Cond {
		return new Cond({ op: "any", conds });
	}

	static not(cond: Cond): Cond {
		return new Cond({ op: "not", cond });
	}

	static server(): Cond {
		return new Cond({ op: "server" });
	}

	/** `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in`, `empty`, `not empty`, `truthy`. */
	static fromShorthand(field: string, op: CondOp, value: unknown = null): Cond {
		const factory = SHORTHAND[op];
		if (factory === undefined) {
			throw new Error(`Unknown condition operator "${op}".`);
		}
		return factory(field, value);
	}

	/** A Cond, or the shorthand `(field, op, value)` every *If() method accepts. */
	static from(condOrField: Cond | string, op?: CondOp, value?: unknown): Cond {
		if (condOrField instanceof Cond) {
			return condOrField;
		}
		return Cond.fromShorthand(condOrField, op ?? ("" as CondOp), value ?? null);
	}

	toJSON(): Record<string, unknown> {
		return this.data;
	}
}

const asList = (value: unknown): unknown[] => {
	if (Array.isArray(value)) {
		return value;
	}
	return value === null || value === undefined ? [] : [value];
};

const SHORTHAND: Record<string, (field: string, value: unknown) => Cond> = {
	"=": (f, v) => Cond.eq(f, v),
	"!=": (f, v) => Cond.neq(f, v),
	">": (f, v) => Cond.gt(f, v),
	">=": (f, v) => Cond.gte(f, v),
	"<": (f, v) => Cond.lt(f, v),
	"<=": (f, v) => Cond.lte(f, v),
	in: (f, v) => Cond.in(f, asList(v)),
	"not in": (f, v) => Cond.notIn(f, asList(v)),
	empty: (f) => Cond.empty(f),
	"not empty": (f) => Cond.notEmpty(f),
	truthy: (f) => Cond.truthy(f),
};
