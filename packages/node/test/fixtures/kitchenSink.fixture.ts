import {
	Column,
	Cond,
	CreateAction,
	defineAbility,
	EditAction,
	Effects,
	Embed,
	type Node,
	S,
	Tab,
	ViewAction,
} from "../../src/dsl";

type Query = { where(column: string, value: unknown): Query };
const stubQuery: Query = { where: () => stubQuery };

/** A line-for-line port of packages/php/tests/Fixtures/KitchenSinkPage.php. */
export function kitchenSink(s: S = new S()): Node {
	defineAbility("kitchen-sink-edit", () => true);

	return s.stack([
		s.displayText("Kitchen sink").variant("heading"),
		s.displayText("Every node kind the PHP DSL can emit.").variant("muted"),
		s.displayDivider(),
		s.section(
			{
				title: "Display primitives",
				description: "Read-only render blocks for detail/show pages.",
				icon: "monitor",
				collapsible: true,
				columns: 2,
			},
			[
				s.displayValue("active").badge({ active: { label: "Active", color: "success" } }),
				s.displayValue(true).boolean({ trueColor: "success" }),
				s.displayValue("shipped").icon({ shipped: { icon: "truck", color: "success" } }),
				s.displayValue(12345).money("USD"),
				s.displayValue("2024-03-15 10:30:00").date("Y-m-d"),
				s.displayValue(1234.5).number(2),
				s.displayValue(null).field("title"),
				s.displayImage("/img/cover.png").alt("Cover").caption("Figure 1"),
				s.displayImage("/img/avatar.png").circular(),
				s.displayImage("/img/thumb.png").square(),
				s.displayImage("/files/report.pdf").asLink(),
				s.displayRichtext({
					root: {
						children: [
							{
								children: [
									{
										detail: 0,
										format: 0,
										mode: "normal",
										style: "",
										text: "Hello",
										type: "text",
										version: 1,
									},
								],
								direction: "ltr",
								format: "",
								indent: 0,
								type: "paragraph",
								version: 1,
							},
						],
						direction: "ltr",
						format: "",
						indent: 0,
						type: "root",
						version: 1,
					},
				}),
				s.displayKeyValue({ SKU: "A-1", Weight: "2kg" }),
			],
		),
		s.grid({ cols: { sm: 1, md: 2, lg: 4 } }, [
			s
				.stat("Revenue")
				.value(42)
				.delta("+8%", "up")
				.icon("dollar-sign")
				.tooltip("Monthly revenue")
				.url("/admin/orders")
				.hiddenIf("period", "=", "all")
				.toNode(),
			s
				.stat("Signups")
				.value(() => 7)
				.params([
					s
						.select("range")
						.set("options", [
							{ value: "7d", label: "7 days" },
							{ value: "30d", label: "30 days" },
						])
						.default("7d"),
				])
				.toNode(),
			s
				.chart("byMonth", "line", {
					data: [{ month: "Jan", count: 3 }],
					series: [{ dataKey: "count", label: "Posts" }],
					xKey: "month",
				})
				.toNode(),
			s
				.chart("byStatus", "donut", { nameKey: "status" })
				.query(() => [])
				.hiddenIf("view", "!=", "status")
				.toNode(),
			s
				.chart("byInterval", "bar", { xKey: "period" })
				.query(() => [])
				.params([
					s
						.select("interval")
						.set("options", [
							{ value: "day", label: "Day" },
							{ value: "week", label: "Week" },
							{ value: "month", label: "Month" },
						])
						.default("day"),
					s.date("from"),
				])
				.toNode(),
		]),
		s.section(
			{
				title: "Recently updated",
				url: "https://example.com/changelog",
				openUrlInNewTab: true,
				actions: [s.action("openRecent").label("Open pages").url("/admin/pages").link()],
			},
			[
				s
					.list("recent")
					.items(() => [
						{ title: "Home", meta: "2h", url: "/admin/pages/1", openUrlInNewTab: true },
						s.listItem("About").color("success").url("/admin/pages/2"),
					])
					.toNode(),
			],
		),
		s.section(
			{
				title: "Form",
				icon: { name: "file-text", position: "right" },
				aside: s
					.displayText("Fill every field to see full validation coverage.")
					.variant("muted"),
			},
			[postForm(s)],
		),
		s.tabs(
			[
				{
					name: "main",
					label: "Main",
					body: s.displayText("Tab body").variant("subheading"),
					icon: "star",
					badge: "3",
					active: true,
				},
				{ name: "more", label: "More", body: s.displayText("Second tab").variant("muted") },
				{
					name: "grid",
					label: "Grid",
					children: [
						s.displayText("Left").variant("body"),
						s.displayText("Right").variant("body"),
					],
					columns: 2,
				},
			],
			{ name: "content" },
		),
		postsTable(s),
		s.actionsRow(modalActions(s)),
		s.collapsible({ label: "Advanced options" }, [s.text("meta_title").label("Meta title")]),
		s.aside([s.text("sidebar_note").label("Note")]),
		s.actionGroup("Publish actions", [
			s.action("publish").label("Publish").url("/admin/posts/publish"),
			s.action("preview").label("Preview").url("/admin/posts/preview").openUrlInNewTab(),
			s
				.action("archive")
				.label("Archive")
				.handle(() => Effects.make(), ["row"]),
		]),
		s.flex([s.text("flex_a"), s.text("flex_b")], {
			direction: "row",
			justify: "between",
			align: "center",
			gap: 4,
			wrap: true,
		}),
		s.row(
			[
				s.logo(),
				s.navMenu(),
				s.spacer(),
				s.localeSwitcher(),
				s.notifications(),
				s.userMenu(),
			],
			{ gap: 2, class: "items-center" },
		),
		s.flex([s.unsavedIndicator(), s.unsavedIndicator("Custom label")]),
	]);
}

function postForm(s: S) {
	return s
		.form("post", [
			s
				.text("title")
				.label("Title")
				.prefix("Post")
				.suffix("title")
				.required()
				.rules("max:200")
				.columnSpan({ sm: 1, md: 2 }),
			s.otp("auth_code").label("Code").length(6).rules("digits:6"),
			s
				.textarea("body")
				.label("Body")
				.helperText("Supports Markdown.")
				.tooltip("Write the post body here."),
			s
				.number("rating")
				.suffix("stars")
				.step(0.01)
				.rules("integer|min:0|max:5")
				.columnStart(2),
			s.boolean("published"),
			s
				.radio("priority")
				.label("Priority")
				.inline()
				.options([
					{ value: "low", label: "Low", description: "No rush" },
					{ value: "high", label: "High", description: "Time sensitive", disabled: true },
				]),
			s.radio("archived").label("Archived").boolean(),
			s.date("publishedAt").hiddenIf("published", "=", false),
			s
				.daterange("promo_window")
				.label("Promo window")
				.dependsOn("title")
				.disabledRanges((deps) => [
					{ from: null, to: "2026-01-31" },
					{ from: "2026-06-10", to: "2026-06-20" },
					// The record seeds title = 'Hello', so the open-end range starts 2026-12-01.
					{
						from: (deps.title ?? "") === "Hello" ? "2026-12-01" : "2026-11-01",
						to: null,
					},
				]),
			s.time("opensAt").label("Opening time").minuteStep(15),
			s.time("closesAt").label("Closing time").seconds().secondStep(5),
			s.text("video_url").hiddenIf("type", "!=", "video"),
			s.text("company_name").label("Company name").requiredIf("type", "=", "company"),
			s
				.text("caption")
				.disabledIf(Cond.all(Cond.eq("status", "archived"), Cond.empty("published_at"))),
			s
				.select("role")
				.prefix("Role")
				.set("options", [{ value: "admin", label: "Admin" }])
				.rules("in:admin,editor"),
			s
				.select("permissions")
				.options([
					{ value: "read", label: "Read" },
					{ value: "write", label: "Write" },
					{ value: "delete", label: "Delete" },
				])
				.multiple()
				.rules("in:read,write,delete")
				.creatable([s.text("name").label("Permission name").required()], (v) => ({
					value: v.name,
					label: v.name,
				})),
			s
				.select("car_id")
				.searchable()
				.options([
					{
						value: 12,
						label: "Toyota Camry",
						display: {
							image: "https://cdn.example.com/cars/12.jpg",
							subtitle: "Sedan · AA1234BB · black",
						},
					},
					{ value: 13, label: "No car" },
				]),
			s.select("plan").options([
				{
					value: "pro",
					label: "Pro — $49/mo",
					display: { html: "<b>Pro</b> <s>$99</s> $49/mo" },
				},
			]),
			s.text("intro").translatable(),
			s.slug("slug").set("fromField", "title").rules(["regex:/^[a-z0-9-]+$/"]),
			s
				.richtext("content")
				.set("placeholder", "Start typing…")
				.embeds([
					Embed.make("callout")
						.label("Callout")
						.icon("info")
						.summary("title")
						.fields([s.text("title").required(), s.textarea("text")]),
				]),
			s
				.upload("attachment")
				.label("Attachment")
				.disk("public")
				.directory("docs")
				.visibility("public")
				.accept("image/*")
				.maxSize(5 * 1024 * 1024)
				.convertTo("webp")
				.quality(80),
			s
				.upload("gallery")
				.label("Gallery")
				.disk("public")
				.directory("gallery")
				.accept("image/*")
				.maxSize(5 * 1024 * 1024)
				.multiple()
				.maxFiles(5)
				.reorderable(),
			s
				.relation("category_id")
				.labelKey("name")
				.searchable()
				.query(() => null),
			s
				.repeater("sections")
				.rules("array|max:10")
				.minItems(1)
				.defaultItems(2)
				.set("fields", [s.text("heading").required(), s.textarea("text")]),
			s
				.repeater("menu")
				.collapsible()
				.summary("label")
				.set("fields", [
					s.text("label").required(),
					s
						.repeater("children")
						.collapsible()
						.summary("label")
						.set("fields", [s.text("label").required()]),
				]),
			s
				.checkboxlist("tags")
				.options([
					{ value: "news", label: "News" },
					{ value: "guide", label: "Guide" },
				])
				.rules("array"),
			s
				.togglebuttons("visibility")
				.options([
					{ value: "public", label: "Public" },
					{ value: "private", label: "Private" },
				])
				.rules("in:public,private"),
			s
				.togglebuttons("channels")
				.options([
					{ value: "email", label: "Email" },
					{ value: "sms", label: "SMS" },
				])
				.multiple()
				.rules("array"),
			s.slider("score").min(0).max(10).step(1).rules("min:0|max:10"),
			s
				.liveRegion("titlePreview")
				.dependsOn("title")
				.render((deps, r) => [
					r.displayText(String(deps.title ?? "No title yet")).variant("muted"),
				]),
			s.actionsRow([
				s.action("save").label("Save").color("primary").keybinding("mod+s").submit(),
				s.action("cancel").label("Cancel").url("/admin/posts"),
			]),
		])
		.record({ title: "Hello" })
		.onSubmit(() => Effects.make());
}

function postsTable(s: S) {
	return s
		.table<Query>("posts")
		.columns([
			Column.make("title")
				.label("Title")
				.kind("text")
				.sticky()
				.individuallySearchable()
				.noWrap()
				.description("Headline"),
			{ views: "Views" },
			Column.make("published_at").time("H:i").label("Published time"),
			Column.make("cover").image().circular().alt("Avatar"),
			Column.make("brand_color").color().rounded().label("Color"),
			Column.make("status").badge({
				in_progress: { label: "In progress", color: "warning" },
			}),
			Column.make("published")
				.label("Published")
				.toggle()
				.onSave(() => Effects.make().refreshTable("posts")),
			Column.make("title_edit")
				.label("Title (editable)")
				.textInput()
				.rules("required|max:200")
				.onSave(() => null),
			Column.make("status_edit")
				.label("Status (editable)")
				.selectColumn()
				.options([
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
				])
				.rules("required|in:draft,published")
				.onSave(() => null),
			Column.make("price")
				.label("Price (editable)")
				.numberInput()
				.step("0.01")
				.suffix("USD")
				.rules("required|numeric|min:0")
				.onSave(() => null),
			Column.make("rank").number().prefix("#").label("Rank"),
			Column.make("view")
				.label("View")
				.link((row) => `/admin/posts/${String(row.id)}`, true, "external-link"),
			Column.make("car")
				.label("Авто")
				.group([Column.make("car_name").emphasized(), Column.make("car_plate").muted()]),
		])
		.searchable(["title"])
		.filters([
			s.inFilter("status").options([
				{ value: "draft", label: "Draft" },
				{ value: "published", label: "Published" },
			]),
		])
		.deferFilters()
		.poll(30)
		.filtersIn("inline")
		.filtersFormColumns(2)
		.searchPlaceholder("Search posts…")
		.columnToggle(false)
		.emptyState("No posts yet", "Create your first post to get started.", "file-text")
		.headerActions([
			s.action("createPost").label("New post").icon("pencil").url("/admin/posts/create"),
		])
		.recordUrl(() => "/admin/posts/1")
		.openRecordUrlInNewTab()
		.defaultSort("views", "desc")
		.reorderable("sort_order")
		.groups("views", { collapsed: true })
		.tabs([
			Tab.make<Query>("all"),
			Tab.make<Query>("published")
				.label("Published")
				.icon("check")
				.tooltip("Published posts")
				.description("Live posts visible to readers")
				.query((q) => q.where("published", true))
				.count(),
		])
		.rowActions([
			s
				.action("edit")
				.label("Edit")
				.icon("pencil")
				.tooltip("Edit this record")
				.hiddenIf("published", "=", true)
				.authorize("kitchen-sink-edit")
				.handle(() => Effects.make(), ["row"]),
			s
				.action("delete")
				.label("Delete")
				.color("danger")
				.icon("trash")
				.disabledIf("locked", "truthy")
				.confirm("Delete?", "No undo.")
				.handle(() => Effects.make(), ["row"]),
		])
		.bulkActions([
			s
				.action("bulk-delete")
				.label("Delete selected")
				.hiddenIf("role", "=", "manager")
				.handle(() => Effects.make(), ["selection"]),
		])
		.simplePagination()
		.query(() => stubQuery)
		.toNode();
}

function modalActions(s: S) {
	return [
		s
			.action("info")
			.label("About")
			.modal("About", s.displayText("Modal body").variant("muted"))
			.size("sm")
			.outlined(),
		s
			.action("details")
			.label("Details")
			.modal("Details", null, "More info")
			.modalWidth("4xl")
			.slideOver(),
		s.action("copy").label("Copy").custom("clipboard", { text: "hi" }).link(),
		EditAction.make(s, {
			form: s.form("editPost", [
				s.text("title").label("Title").required().rules("max:200"),
				s.boolean("published").label("Published"),
			]),
			loadUsing: () => ({ title: "Hello", published: true }),
			saveUsing: () => Effects.make(),
			title: "Edit post",
		}),
		s
			.action("validate")
			.label("Validate")
			.modal(
				"Validate",
				s.stack([
					s
						.action("runValidation")
						.label("Check")
						.color("primary")
						.handle(() => Effects.make().haltModal("Title is required."), ["form"]),
				]),
			),
		CreateAction.make(s, {
			form: s.form("createPost", [s.text("title").label("Title").required()]),
			storeUsing: () => Effects.make(),
			defaultRecord: { title: "" },
		}),
		ViewAction.make(s, {
			loadUsing: () => ({ title: "Hello" }),
			render: () => s.displayValue(null).field("title"),
		}),
	];
}
