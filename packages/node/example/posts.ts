import { definePage, effects, type S, type TableQuery } from "../src";

/** In-memory "database" so the sketch runs with zero setup. A real host plugs Kysely here. */
export type Post = {
	id: number;
	title: string;
	slug: string;
	status: "draft" | "published";
	views: number;
};

export const db = {
	posts: [
		{ id: 1, title: "Hello world", slug: "hello-world", status: "published", views: 120 },
		{ id: 2, title: "Second post", slug: "second-post", status: "draft", views: 4 },
		{
			id: 3,
			title: "Bun and TanStack",
			slug: "bun-and-tanstack",
			status: "published",
			views: 77,
		},
	] as Post[],
	find(id: string | number) {
		return this.posts.find((p) => p.id === Number(id));
	},
};

const statusChoices = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
] as const;

export const postsIndex = definePage({
	path: "posts",
	title: "Posts",
	nav: { group: "Content", label: "Posts", icon: "file-text", order: 1 },
	view: (s) =>
		s.stack([
			s.row([s.action("new").label("New post").color("primary").url("/admin/posts/new")]),
			postsTable(s),
		]),
});

function postsTable(s: S) {
	return s
		.table("posts")
		.columns([
			s
				.column("id")
				.label("ID")
				.format((v) => `#${v}`),
			s.column("title").label("Title").sortable().searchable(),
			s
				.column("status")
				.label("Status")
				.badge({
					published: { label: "Live", color: "success" },
					draft: { label: "Draft" },
				}),
			s.column("views").label("Views").kind("number").sortable().align("right"),
		])
		.defaultSort("id", "desc")
		.paginate(10, [10, 25])
		.rowActions([
			s
				.action("edit")
				.label("Edit")
				.icon("pencil")
				.needs("row")
				.handle(({ row }) => `/admin/posts/${row._key}/edit`),
			s
				.action("delete")
				.label("Delete")
				.color("danger")
				.confirm("Delete post?", "This cannot be undone.")
				.needs("row")
				.handle(({ row }) => {
					db.posts = db.posts.filter((p) => p.id !== row._key);
					return effects().notify("Post deleted").refreshTable("posts");
				}),
		])
		.rows(async (q) => memoryRows(q));
}

/** The row source a real host writes with Kysely (see `@tbtop/admin-node/kysely`). */
function memoryRows(q: TableQuery) {
	const { search, sort } = q;
	const field = (r: Post, f: string) => r[f as keyof Post];
	const rows = db.posts.filter(
		(r) =>
			!search ||
			search.fields.some((f) =>
				String(field(r, f)).toLowerCase().includes(search.text.toLowerCase()),
			),
	);
	if (sort) {
		const dir = sort.dir === "desc" ? -1 : 1;
		rows.sort((a, b) => (field(a, sort.field) > field(b, sort.field) ? dir : -dir));
	}
	const pageRows = rows.slice((q.page - 1) * q.perPage, q.page * q.perPage);
	return { rows: pageRows, total: rows.length };
}

function postForm(name: string, slugTaken: (slug: string) => boolean) {
	return (s: S) =>
		s.form(name, [
			s.section("Content", [
				s.text("title").label("Title").required().max(200),
				s
					.slug("slug")
					.label("Slug")
					.from("title")
					.required()
					.regex(/^[a-z0-9-]+$/)
					.refine((v) => !slugTaken(v), "The slug has already been taken."),
			]),
			s.section(
				"Publishing",
				[
					s.select("status").label("Status").options(statusChoices).required(),
					s.number("views").label("Views").min(0),
				],
				{ columns: 2 },
			),
			s.row([
				s.action("save").label("Save").color("primary").submit(),
				s.action("cancel").label("Cancel").url("/admin/posts"),
			]),
		]);
}

export const postEdit = definePage({
	path: "posts/$post/edit",
	title: "Edit post",
	view: (s, { params }) => {
		const post = db.find(params.post ?? "");
		if (!post) {
			throw new Response("Not found", { status: 404 });
		}
		return postForm("post", (slug) =>
			db.posts.some((p) => p.slug === slug && p.id !== post.id),
		)(s)
			.record(post)
			.onSubmit(({ form }) => {
				// form: { title: string; slug: string; status: "draft" | "published"; views: number | null }
				Object.assign(post, { ...form, views: form.views ?? 0 });
				return effects().notify("Saved");
			});
	},
});

export const postNew = definePage({
	path: "posts/new",
	title: "New post",
	view: (s) =>
		postForm("post", (slug) => db.posts.some((p) => p.slug === slug))(s)
			.record({ status: "draft" })
			.onSubmit(({ form }) => {
				const id = Math.max(0, ...db.posts.map((p) => p.id)) + 1;
				db.posts.push({ id, ...form, views: form.views ?? 0 });
				return effects().notify("Post created").redirect(`/admin/posts/${id}/edit`);
			}),
});

export const pages = [postsIndex, postNew, postEdit];
