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
- **Extension surface is `protected`; the security core is `private`.** Throttle,
  credential attempt and session renewal cannot be overridden; hooks wrap them.
  Every protected hook is frozen API after 1.0.
- **Everything runs on the panel guard**, never the app default — auth pages sit on
  `['web']`, so `auth:{guard}` never sets it for them.
- **Guest redirect is plain Laravel `redirectGuestsTo`**, printed as a manual step and
  resolved per request through `LoginPage::url()`. No panel method for it.
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
the behaviour. Throttle and session renewal are where a well-meant override opens a hole,
so they stay out of reach.
