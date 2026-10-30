const str = (description: string) => ({ type: "string", description });
const obj = (description: string) => ({ type: "object", description });
const int = (description: string) => ({ type: "integer", description });

/** Tool descriptions and input schemas, as the PHP server (SearchTool/QueryTool/ExecuteTool) lists them. */
export const SCHEMAS = {
	search: {
		description: `Discover what you can do in this admin panel. Without arguments: an index of every page you may
open, with the executable ids (actions/forms) and table names of pages that take no params. With
\`page\` (+ \`params\` for a page whose path has params, e.g. a record id, as strings): that page's
executables with their arguments, and its tables. Each executable lists its \`needs\`
(form/row/selection) and form fields with Laravel validation rules and \`help\` text;
a \`translatable\` field takes an object keyed by locale (see its nestedRules).
Pass \`values: true\` to get each form's current data as \`values\`; do that before an edit: build
it from \`values\`, not from query() rows, which are formatted for display.
A field you omit is absent from the handler's input; resend \`values\` for fields you keep.
A container's row fields follow it as \`name.*.child\`; send rows as a list of objects.
Fields listed in a form's \`excludedFields\` cannot be changed: omit them, or send the value \`values\`
holds (a repeater row resent whole, at its stored position); execute() refuses any other value.
A richtext value is a Lexical editor state {root: {type: "root", children: [...]}} built from the
node types in its \`nodes\`; copy the node shape from \`values\`, the error names a missing key. An
\`embeds\` entry is a root child {type: "embed", version: 1, id (unique), kind, data} whose
\`data\` fills that kind's \`fields\`.
A field with \`options: "dynamic"\` lists its choices through query() (\`executable\` + \`field\`, with
\`deps\` for the names in its \`dependsOn\`). A \`mask\` formats a text value: 9 digit, a letter, * letter
or digit, any other character literal; send the value as the mask formats it, literals included.`,
		inputSchema: {
			type: "object",
			properties: {
				page: str("Page id (its path) from a previous search()."),
				params: obj('Route params of the page as strings, e.g. {"post": "12"}.'),
				values: {
					type: "boolean",
					description: "With `page`: include each form's current `values`.",
				},
			},
		},
		annotations: { readOnlyHint: true },
	},
	query: {
		description: `Read rows of a table found by search(). A row is what the admin table receives: its key
(\`_key\`) and its visible columns, formatted; no other record attributes.
Pass a row unchanged as \`row\` to execute() for a row action, or keys as \`selection\`. Filters take
the value shape search() states per filter; search, columnSearch, filters, tabs, sort and perPage
accept only what search() listed for that table, and anything else is refused.
For a field or filter whose options are "dynamic", the same tool lists its choices: pass
\`executable\` + \`field\` (a form field) or \`table\` + \`filter\`, with an optional \`search\` text and
\`deps\` ({parent: value} for every name in the field's dependsOn). Returns {options: [{value,
label}]}, capped like the UI's type-ahead: narrow with search.`,
		inputSchema: {
			type: "object",
			properties: {
				page: str("Page id."),
				table: str("Table name from search(): its rows, or with filter its options."),
				executable: str("Executable id whose form holds field, for an options lookup."),
				field: str("Field name as search() lists it, for an options lookup."),
				filter: str("Filter name of table, for an options lookup."),
				deps: obj("Parent values for a field's dependsOn: {parent: value}."),
				params: obj("Route params of the page, values as strings."),
				pageNumber: int("1-based page of results."),
				perPage: int("One of the table's pagination options."),
				search: str("Table-wide search, or the option search of a lookup."),
				columnSearch: obj("Per-column search: {column: text}."),
				filters: obj("Filter values keyed by filter name."),
				tab: str("Filter tab name."),
				sort: str("Sortable column name."),
				dir: { type: "string", enum: ["asc", "desc"] },
			},
			required: ["page"],
		},
		annotations: { readOnlyHint: true },
	},
	execute: {
		description: `Run an executable found by search(), with the user's own permissions. Pass \`params\` (the route
params of the page the executable lives on, for every executable of that page) and what it \`needs\`: \`form\` (field values), \`row\` (a row from query(),
unchanged: it must keep its \`_key\`) or \`selection\` (the rows' \`_key\` values). A call missing what it needs is
refused. An upload field search() lists takes {"url": "https://…"} (the server downloads and stores
the file) or its current value; a multiple one a list mixing both.
Invalid input returns validation errors and runs nothing;
every error is JSON {message, errors?}. Returns the effects the UI would show; a redirect (form
\`redirect\`, or a \`redirect\` effect) carries the \`page\`/\`params\` it opens so you can search() it next.`,
		inputSchema: {
			type: "object",
			properties: {
				id: str('Executable id "{page}:{name}" from search().'),
				params: obj("Route params of the page, values as strings."),
				form: obj("Field values, for a form or an action that needs form."),
				row: obj("A row returned by query(), for a row action."),
				selection: {
					type: "array",
					items: { type: "string" },
					description:
						"Row keys as strings, for a bulk action; integer keys are passed on as integers.",
				},
			},
			required: ["id"],
		},
		annotations: { readOnlyHint: false, destructiveHint: true },
	},
};

export const INSTRUCTIONS = `An admin panel, acting as the signed-in user with exactly their permissions.
Start with \`search\` to list pages and what each offers; \`search\` with a page (and its params)
for a record page. Read rows with \`query\`, then run actions and forms with \`execute\`.`;
