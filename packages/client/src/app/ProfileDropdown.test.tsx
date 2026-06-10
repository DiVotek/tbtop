import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nProvider } from "../i18n/i18n";
import { ProfileDropdown } from "./ProfileDropdown";

const originalRouter = inertiaReact.router;
let routerPostMock: ReturnType<typeof mock>;

beforeEach(() => {
	routerPostMock = mock(() => {});
	(inertiaReact.router as unknown as Record<string, unknown>).post = routerPostMock;
	window.document.cookie = "tbtop_theme=; max-age=0";
	window.document.documentElement.classList.remove("dark");
});

afterEach(() => {
	(inertiaReact.router as unknown as Record<string, unknown>).post =
		originalRouter.post.bind(originalRouter);
	window.document.cookie = "tbtop_theme=; max-age=0";
	window.document.documentElement.classList.remove("dark");
});

describe("ProfileDropdown", () => {
	test("ProfileDropdown: renders user display name in trigger", () => {
		const { getByTestId } = render(
			<ProfileDropdown user={{ name: "Alice Smith", email: "alice@example.com" }} />,
		);
		expect(getByTestId("profile-name").textContent).toBe("Alice Smith");
	});

	test("ProfileDropdown: falls back to email when name is absent", () => {
		const { getByTestId } = render(<ProfileDropdown user={{ email: "bob@example.com" }} />);
		expect(getByTestId("profile-name").textContent).toBe("bob@example.com");
	});

	test("ProfileDropdown: returns null when user is null", () => {
		const { queryByTestId } = render(<ProfileDropdown user={null} />);
		expect(queryByTestId("profile-trigger")).toBeNull();
	});

	test("ProfileDropdown: menu is hidden before trigger click", () => {
		const { queryByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		expect(queryByTestId("profile-menu")).toBeNull();
	});

	test("ProfileDropdown: clicking trigger opens the menu", async () => {
		const { getByTestId, findByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
	});

	test("ProfileDropdown: clicking logout button posts to /logout by default", async () => {
		const { getByTestId, findByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("profile-logout"));
		});
		expect(routerPostMock.mock.calls[0]?.[0]).toBe("/logout");
	});

	test("ProfileDropdown: logout posts to custom logoutPath when provided", async () => {
		const { getByTestId, findByTestId } = render(
			<ProfileDropdown user={{ name: "Alice" }} logoutPath="/admin/logout" />,
		);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("profile-logout"));
		});
		expect(routerPostMock.mock.calls[0]?.[0]).toBe("/admin/logout");
	});

	test("ProfileDropdown: selecting dark theme adds dark class to html element", async () => {
		const { getByTestId, findByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("theme-option-dark"));
		});
		expect(window.document.documentElement.classList.contains("dark")).toBe(true);
	});

	test("ProfileDropdown: selecting light theme removes dark class from html element", async () => {
		window.document.documentElement.classList.add("dark");
		const { getByTestId, findByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("theme-option-light"));
		});
		expect(window.document.documentElement.classList.contains("dark")).toBe(false);
	});

	test("ProfileDropdown: selecting a theme writes tbtop_theme cookie", async () => {
		const { getByTestId, findByTestId } = render(<ProfileDropdown user={{ name: "Alice" }} />);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("theme-option-dark"));
		});
		expect(window.document.cookie).toContain("tbtop_theme=dark");
	});

	test("ProfileDropdown: shows locale options in menu when multiple languages configured", async () => {
		const { getByTestId, findByTestId, queryByTestId } = render(
			<I18nProvider
				defaultLang="en"
				languages={{ en: async () => ({}), uk: async () => ({}) }}
			>
				<ProfileDropdown user={{ name: "Alice" }} />
			</I18nProvider>,
		);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		expect(queryByTestId("locale-option-en")).not.toBeNull();
		expect(queryByTestId("locale-option-uk")).not.toBeNull();
	});

	test("ProfileDropdown: clicking a locale option switches to that locale", async () => {
		const changes: string[] = [];
		const { getByTestId, findByTestId } = render(
			<I18nProvider
				defaultLang="en"
				languages={{ en: async () => ({}), uk: async () => ({}) }}
				onLocaleChange={(l) => changes.push(l)}
			>
				<ProfileDropdown user={{ name: "Alice" }} />
			</I18nProvider>,
		);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		await act(async () => {
			fireEvent.click(getByTestId("locale-option-uk"));
		});
		await waitFor(() => expect(changes).toEqual(["uk"]));
	});

	test("ProfileDropdown: hides locale section when only one language configured", async () => {
		const { getByTestId, findByTestId, container } = render(
			<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
				<ProfileDropdown user={{ name: "Alice" }} />
			</I18nProvider>,
		);
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		expect(container.querySelector('[data-testid^="locale-option-"]')).toBeNull();
	});
});
