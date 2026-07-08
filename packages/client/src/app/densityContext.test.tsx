import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue } from "../ui/select";
import { AdminLayoutShell } from "./AdminLayout";
import { DensityContext, useDensity } from "./densityContext";

const USER = { name: "Alice", email: "alice@example.com" };
const NAV = [
	{ key: "Content", group: "Content", items: [{ label: "Posts", href: "/admin/posts" }] },
];

function DensityProbe() {
	const density = useDensity();
	return <span data-testid="density-probe">{density}</span>;
}

describe("useDensity", () => {
	test("defaults to 'default' without a provider", () => {
		const { getByTestId } = render(<DensityProbe />);
		expect(getByTestId("density-probe").textContent).toBe("default");
	});

	test("reads 'compact' from a DensityContext.Provider", () => {
		const { getByTestId } = render(
			<DensityContext.Provider value="compact">
				<DensityProbe />
			</DensityContext.Provider>,
		);
		expect(getByTestId("density-probe").textContent).toBe("compact");
	});
});

describe("density: Button", () => {
	test("default density keeps the default button size", () => {
		const { getByText } = render(<Button>Click</Button>);
		expect(getByText("Click").getAttribute("data-size")).toBe("default");
	});

	test("compact density defaults the button to size sm", () => {
		const { getByText } = render(
			<DensityContext.Provider value="compact">
				<Button>Click</Button>
			</DensityContext.Provider>,
		);
		const button = getByText("Click");
		expect(button.getAttribute("data-size")).toBe("sm");
		expect(button.className).toContain("shadow-sm");
	});

	test("an explicit size prop wins over compact density", () => {
		const { getByText } = render(
			<DensityContext.Provider value="compact">
				<Button size="lg">Click</Button>
			</DensityContext.Provider>,
		);
		const button = getByText("Click");
		expect(button.getAttribute("data-size")).toBe("lg");
		expect(button.className).not.toContain("shadow-sm");
	});
});

describe("density: Input", () => {
	test("compact density shrinks the input height", () => {
		const { getByDisplayValue } = render(
			<DensityContext.Provider value="compact">
				<Input defaultValue="hi" />
			</DensityContext.Provider>,
		);
		expect(getByDisplayValue("hi").className).toContain("h-8");
	});

	test("default density keeps the input at h-9", () => {
		const { getByDisplayValue } = render(<Input defaultValue="hi" />);
		const className = getByDisplayValue("hi").className;
		expect(className).toContain("h-9");
		expect(className).not.toContain("h-8");
	});
});

describe("density: SelectTrigger", () => {
	test("default density keeps the trigger at size default", () => {
		const { getByTestId } = render(
			<Select>
				<SelectTrigger data-testid="trigger">
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
			</Select>,
		);
		expect(getByTestId("trigger").getAttribute("data-size")).toBe("default");
	});

	test("compact density defaults the trigger to size sm", () => {
		const { getByTestId } = render(
			<DensityContext.Provider value="compact">
				<Select>
					<SelectTrigger data-testid="trigger">
						<SelectValue placeholder="Pick one" />
					</SelectTrigger>
				</Select>
			</DensityContext.Provider>,
		);
		expect(getByTestId("trigger").getAttribute("data-size")).toBe("sm");
	});

	test("an explicit size prop wins over compact density", () => {
		const { getByTestId } = render(
			<DensityContext.Provider value="compact">
				<Select>
					<SelectTrigger data-testid="trigger" size="default">
						<SelectValue placeholder="Pick one" />
					</SelectTrigger>
				</Select>
			</DensityContext.Provider>,
		);
		expect(getByTestId("trigger").getAttribute("data-size")).toBe("default");
	});
});

describe("density: sidebar width", () => {
	test("default density keeps the sidebar at w-56", () => {
		const { getByTestId } = render(
			<AdminLayoutShell nav={NAV} user={USER} currentUrl="/admin/posts">
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("admin-sidebar").closest("aside")?.className).toContain("w-56");
	});

	test("compact density narrows the sidebar to w-48", () => {
		const { getByTestId } = render(
			<AdminLayoutShell
				nav={NAV}
				user={USER}
				currentUrl="/admin/posts"
				appearance={{ density: "compact" }}
			>
				<div />
			</AdminLayoutShell>,
		);
		expect(getByTestId("admin-sidebar").closest("aside")?.className).toContain("w-48");
	});
});
