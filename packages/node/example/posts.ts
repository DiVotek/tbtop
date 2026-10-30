import { Column, definePage, Effects, type HostRule, HttpError, type Row, type S } from "../src";
import { memoryDriver, memoryQuery } from "../src/adapters/memory";

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

/** The query driver the panel runs tables through. */
export const driver = memoryDriver();

/** `unique:posts,slug[,ignoreId,idColumn]` against the in-memory table: a host rule. */
export const hostRules: Record<string, HostRule> = {
	unique: {
		message: "The :attribute has already been taken.",
		check: (value, [table, column = "slug", ignore, idColumn = "id"]) => {
			const rows = (table === "posts" ? db.posts : []) as unknown as Row[];
			return !rows.some((r) => r[column] === value && String(r[idColumn]) !== String(ignore));
		},
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
			Column.make("id")
				.label("ID")
				.formatUsing((v) => `#${String(v)}`),
			Column.make("title").label("Title").sortable().searchable(),
			Column.make("status")
				.label("Status")
				.badge({
					published: { label: "Live", color: "success" },
					draft: { label: "Draft" },
				}),
			Column.make("views").label("Views").number().sortable().align("right"),
		])
		.filters([
			s
				.inFilter("status")
				.label("Status")
				.options([...statusChoices]),
		])
		.defaultSort("id", "desc")
		.paginate(10, [10, 25])
		.rowActions([
			s
				.action("edit")
				.label("Edit")
				.icon("pencil")
				.handle((ctx) => `/admin/posts/${String(ctx.key())}/edit`, ["row"]),
			s
				.action("delete")
				.label("Delete")
				.color("danger")
				.confirm("Delete post?", "This cannot be undone.")
				.handle(
					(ctx) => {
						db.posts = db.posts.filter((p) => p.id !== ctx.key());
						return Effects.make().notify("Post deleted").refreshTable("posts");
					},
					["row"],
				),
		])
		.query(() => memoryQuery(() => db.posts as unknown as Row[]));
}

function postForm(s: S, ignoreId?: number) {
	const unique =
		ignoreId === undefined ? "unique:posts,slug" : `unique:posts,slug,${ignoreId},id`;
	return s.form("post", [
		s.section({ title: "Content" }, [
			s.text("title").label("Title").required().rules("max:200"),
			s
				.slug("slug")
				.label("Slug")
				.fromField("title")
				.required()
				.regex("/^[a-z0-9-]+$/")
				.rules(unique),
		]),
		s.section({ title: "Publishing", columns: 2 }, [
			s
				.select("status")
				.label("Status")
				.options([...statusChoices])
				.required()
				.in(["draft", "published"]),
			s.number("views").label("Views").rules("nullable|integer|min:0"),
		]),
		s.actionsRow([
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
			throw new HttpError(404, "Post not found.");
		}
		return postForm(s, post.id)
			.record(post)
			.onSubmit(({ form }) => {
				Object.assign(post, { ...form, views: Number(form.views ?? 0) });
				return Effects.make().notify("Saved");
			});
	},
});

export const postNew = definePage({
	path: "posts/new",
	title: "New post",
	view: (s) =>
		postForm(s)
			.record({ status: "draft" })
			.onSubmit(({ form }) => {
				const id = Math.max(0, ...db.posts.map((p) => p.id)) + 1;
				db.posts.push({
					id,
					...(form as Omit<Post, "id">),
					views: Number(form.views ?? 0),
				});
				return Effects.make().notify("Post created").redirect(`/admin/posts/${id}/edit`);
			}),
});

export const pages = [postsIndex, postNew, postEdit];
