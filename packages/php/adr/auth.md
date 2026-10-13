---
domain: auth
---

# Auth: host-owned, scaffolded from package base pages

## Decisions

- **The host owns auth; the package ships base pages.** `Tbtop\Admin\Auth\{LoginPage,
  ForgotPasswordPage, ResetPasswordPage}` are abstract DSL pages holding the behaviour.
  `admin:install --auth` publishes empty host subclasses into `app/Admin/Pages/Auth/`;
  the host overrides hooks or deletes the file. A project that never runs `--auth` has
  no auth code from the package.
- **No controllers, routes or form requests.** Each screen is a page whose form
  `onSubmit` does the work; logout is the one package route (`POST {prefix}/logout`).
- **Extension surface is `protected`, the security core included.** `authenticate()`,
  `sendLink()` and `resetPassword()` (throttle, credential attempt, session renewal) are
  protected so a host that rebuilds `view()` can still call them, or wrap them through
  `parent::`. The throttle key follows `credentials()`, so a username login needs no
  second override. Every protected method is frozen API after 1.0.
  > Replaces previous decision (see git history) — the core was `private`, which left a
  > host that rebuilt the form no way to reach it short of copying it.
- **Everything runs on the panel guard**, never the app default — auth pages sit on
  `['web']`, so `auth:{guard}` never sets it for them.
- **Auth pages do not inherit the panel's middleware.** The panel stack may hold an access
  check (the demo's `RequireFullAuth`) that would bounce a guest off the login itself. A
  host whose panel-wide allowlist must cover sign-in overrides `middleware()` in its subclass.
- **The password broker is a panel setting**, `PanelConfig::passwordBroker()`, null
  meaning the app default — as Filament's `authPasswordBroker()`. Not a page hook: the
  forgot and reset pages must use one broker, and two hooks could drift. Not derived from
  the guard's provider: Laravel never links them, so the setting stays explicit.
- **The reset form answers an unknown email like a bad token** and throttles failures
  per IP, matching the neutral forgot-password answer.
- **Guest redirect is plain Laravel `redirectGuestsTo`**, printed as a manual step and
  resolved per request through `LoginPage::currentUrl()`. No panel method for it.
- **Signed-in users are turned away by `RedirectSignedInUsers`**, not Laravel's `guest`,
  which lands on the app's dashboard/home route and knows nothing of panels.
- **Reset mail URL is fixed at send time** (`ResetPasswordNotification`), not through the
  global `ResetPassword::createUrlUsing()`.
- **Auth pages never become the panel home.**
- **Base set is login + password reset.** 2FA, email verification, registration and
  passkeys are deferred; the demo builds 2FA on `afterAuthenticated()`.

## Why

Filament's package-registered auth pages are hard to customise; a Breeze-style full copy
never receives fixes. Subclasses of package bases give the host the file and the package
the behaviour. Throttle and session renewal are where a well-meant override opens a hole;
they stay callable and wrappable, and overriding them is the host's own call.
