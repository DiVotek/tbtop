import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nProvider } from "../i18n/i18n";
import { type ChromeData, ChromeDataContext } from "./chromeContext";
import { ProfileDropdown } from "./ProfileDropdown";

const originalRouter = inertiaReact.router;
let routerPostMock: ReturnType<typeof mock>;

beforeEach(() => {
	routerPostMock = mock(() => {});
	(inertiaReact.router as unknown as Record<string, unknown>).post = routerPostMock;
	window.document.cookie = "tbtop_theme=; path=/; max-age=0";
	window.document.documentElement.classList.remove("dark");
});

afterEach(() => {
	(inertiaReact.router as unknown as Record<string, unknown>).post =
		originalRouter.post.bind(originalRouter);
	window.document.cookie = "tbtop_theme=; path=/; max-age=0";
	window.document.documentElement.classList.remove("dark");
});

describe("ProfileDropdown", () => {
	test("ProfileDropdown: renders user display name in trigger", () => {
		const { getByTestId } = render(
			<ProfileDropdown user={{ name: "Alice Smith", email: "alice@example.com" }} />,
		);
		expect(getByTestId("profile-name").textContent).toBe("Alice Smith");
	});

	test("ProfileDropdown: falls back to the email local part when name is absent", () => {
		const { getByTestId } = render(<ProfileDropdown user={{ email: "bob@example.com" }} />);
		expect(getByTestId("profile-name").textContent).toBe("bob");
	});

	test("ProfileDropdown: falls back to email local part when name is blank", () => {
		const { getByTestId } = render(
			<ProfileDropdown user={{ name: "   ", email: "carol@example.com" }} />,
		);
		expect(getByTestId("profile-name").textContent).toBe("carol");
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

	test("ProfileDropdown: language section heading shows translated label, not raw key", async () => {
		// nav.language was missing from defaultMessages so t() fell back to the
		// key itself, rendering "nav.language" as a visible string in the UI.
		const { getByTestId, findByTestId, container } = render(
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
		// The heading must NOT contain the raw key "nav.language"
		expect(container.textContent).not.toContain("nav.language");
	});
	function renderInChrome(
		chrome: Partial<ChromeData>,
		user: { name?: string; email?: string } | null = { name: "Alice" },
	) {
		const value: ChromeData = {
			nav: [],
			user: null,
			currentUrl: "",
			brand: null,
			orientation: "vertical",
			...chrome,
		};
		return render(
			<ChromeDataContext.Provider value={value}>
				<ProfileDropdown user={user} />
			</ChromeDataContext.Provider>,
		);
	}

	test("ProfileDropdown: renders custom userMenuItems in the menu", async () => {
		const { getByTestId, findByTestId } = renderInChrome({
			userMenuItems: [{ label: "API Tokens", href: "/admin/api-tokens" }],
		});
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		const item = await findByTestId("user-menu-item-/admin/api-tokens");
		expect(item.textContent).toBe("API Tokens");
	});

	test("ProfileDropdown: clicking an internal userMenuItem navigates via router.visit", async () => {
		const visitMock = mock(() => {});
		(inertiaReact.router as unknown as Record<string, unknown>).visit = visitMock;
		const { getByTestId, findByTestId } = renderInChrome({
			userMenuItems: [{ label: "API Tokens", href: "/admin/api-tokens" }],
		});
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		fireEvent.click(await findByTestId("user-menu-item-/admin/api-tokens"));
		expect(visitMock).toHaveBeenCalledWith("/admin/api-tokens");
		(inertiaReact.router as unknown as Record<string, unknown>).visit =
			originalRouter.visit.bind(originalRouter);
	});

	test("ProfileDropdown: omits the custom-items section when userMenuItems is empty", async () => {
		const { getByTestId, findByTestId, queryByTestId } = renderInChrome({});
		await act(async () => {
			fireEvent.click(getByTestId("profile-trigger"));
		});
		await findByTestId("profile-menu");
		expect(queryByTestId(/^user-menu-item-/)).toBeNull();
	});
});
