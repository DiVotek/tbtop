import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { AdminLayoutSlotProps } from "./AdminLayout";
import { AdminLayoutShell } from "./AdminLayout";

const DEFAULT_USER = { name: "Alice Smith", email: "alice@example.com" };
const DEFAULT_NAV = [
	{ key: "Content", group: "Content", items: [{ label: "Posts", href: "/admin/posts" }] },
];

describe("AdminLayout slots", () => {
	test("AdminLayout: default shell renders sidebar with nav.title", () => {
		const { getByTestId, getByText } = render(
			<AdminLayoutShell nav={DEFAULT_NAV} user={DEFAULT_USER} currentUrl="/admin/posts">
				<div>Page content</div>
			</AdminLayoutShell>,
		);
		expect(getByTestId("admin-sidebar")).toBeTruthy();
		// default logo = nav.title translation key (falls back to key)
		expect(getByText("Tabletop")).toBeTruthy();
	});

	test("AdminLayout: default header shows profile dropdown trigger", () => {
		const { getByTestId } = render(
			<AdminLayoutShell nav={[]} user={DEFAULT_USER} currentUrl="/">
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("profile-trigger")).toBeTruthy();
	});

	test("AdminLayout: custom header slot renders instead of default header", () => {
		const { queryByTestId, getByTestId } = render(
			<AdminLayoutShell
				nav={[]}
				user={DEFAULT_USER}
				currentUrl="/"
				slots={{
					header: () => <div data-testid="custom-header">Custom header</div>,
				}}
			>
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("custom-header")).toBeTruthy();
		// default profile trigger should NOT be present
		expect(queryByTestId("profile-trigger")).toBeNull();
	});

	test("AdminLayout: custom sidebar slot renders instead of default sidebar", () => {
		const { queryByTestId, getByTestId } = render(
			<AdminLayoutShell
				nav={DEFAULT_NAV}
				user={DEFAULT_USER}
				currentUrl="/"
				slots={{
					sidebar: () => <nav data-testid="custom-sidebar">My nav</nav>,
				}}
			>
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("custom-sidebar")).toBeTruthy();
		expect(queryByTestId("admin-sidebar")).toBeNull();
	});

	test("AdminLayout: footer slot renders footer when provided", () => {
		const { getByTestId } = render(
			<AdminLayoutShell
				nav={[]}
				user={DEFAULT_USER}
				currentUrl="/"
				slots={{
					footer: () => <div data-testid="custom-footer">Footer text</div>,
				}}
			>
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("custom-footer")).toBeTruthy();
	});

	test("AdminLayout: no footer rendered by default", () => {
		const { container } = render(
			<AdminLayoutShell nav={[]} user={DEFAULT_USER} currentUrl="/">
				<div />
			</AdminLayoutShell>,
		);
		expect(container.querySelector("footer")).toBeNull();
	});

	test("AdminLayout: logo slot overrides the default nav title text", () => {
		const { getByTestId, queryByText } = render(
			<AdminLayoutShell
				nav={[]}
				user={DEFAULT_USER}
				currentUrl="/"
				slots={{
					logo: () => <img src="/logo.svg" alt="Logo" data-testid="custom-logo" />,
				}}
			>
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("custom-logo")).toBeTruthy();
		expect(queryByText("Tabletop")).toBeNull();
	});

	test("AdminLayout: logo links to the panel home when homeUrl is provided", () => {
		const { getAllByText } = render(
			<AdminLayoutShell nav={[]} user={DEFAULT_USER} currentUrl="/" homeUrl="/admin">
				<div />
			</AdminLayoutShell>,
		);
		const logo = getAllByText("Tabletop")[0];
		expect(logo?.closest("a")?.getAttribute("href")).toBe("/admin");
	});

	test("AdminLayout: logo stays a plain element without homeUrl", () => {
		const { getAllByText } = render(
			<AdminLayoutShell nav={[]} user={DEFAULT_USER} currentUrl="/">
				<div />
			</AdminLayoutShell>,
		);
		expect(getAllByText("Tabletop")[0]?.closest("a")).toBeNull();
	});

	test("AdminLayout: slot header receives nav and user as props", () => {
		let receivedProps: AdminLayoutSlotProps | null = null;
		render(
			<AdminLayoutShell
				nav={DEFAULT_NAV}
				user={DEFAULT_USER}
				currentUrl="/"
				slots={{
					header: (props) => {
						receivedProps = props;
						return <div />;
					},
				}}
			>
				<div />
			</AdminLayoutShell>,
		);
		// receivedProps is set synchronously during render
		const captured = receivedProps as unknown as AdminLayoutSlotProps;
		expect(captured.nav).toEqual(DEFAULT_NAV);
		expect(captured.user).toEqual(DEFAULT_USER);
	});

	test("AdminLayout: children render in the main area", () => {
		const { getByText } = render(
			<AdminLayoutShell nav={[]} user={null} currentUrl="/">
				<div data-testid="page-content">Hello world</div>
			</AdminLayoutShell>,
		);
		expect(getByText("Hello world")).toBeTruthy();
	});
	test("AdminLayout: maxContentWidth centers page content in a max-w wrapper", () => {
		const { getByText } = render(
			<AdminLayoutShell
				nav={[]}
				user={DEFAULT_USER}
				currentUrl="/"
				appearance={{ maxWidth: "7xl" }}
			>
				<div>Page body</div>
			</AdminLayoutShell>,
		);
		expect(getByText("Page body").closest(".max-w-7xl")).toBeTruthy();
	});

	test("AdminLayout: no max-width wrapper when maxContentWidth is unset", () => {
		const { getByText } = render(
			<AdminLayoutShell nav={[]} user={DEFAULT_USER} currentUrl="/">
				<div>Page body</div>
			</AdminLayoutShell>,
		);
		expect(getByText("Page body").closest('[class*="max-w-"]')).toBeNull();
	});
});
