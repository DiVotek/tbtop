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
  check (an app's own "signed in" gate) that would bounce a guest off the login itself. A
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
- **Base set is login + password reset + profile, plus opt-in TOTP 2FA.** Email
  verification, registration and passkeys are deferred.
  > Replaces previous decision (see git history) — 2FA was deferred to the demo's own pages.
- **2FA follows the file, like the profile menu entry.** `--2fa` publishes
  `TwoFactorChallengePage`; while the panel serves a subclass, the login checks the password
  with `once()` and parks a 2FA user in the session instead of signing them in, the profile
  page grows a 2FA section, and `RequireTwoFactor` (last in `authStack()`) sends back any
  session that has not passed. No panel flag to keep in sync. Without the page, the login
  keeps plain `attempt()`.
- **The pass names the user and lives in the session.** The demo's `auth.2fa.completed`
  was a bare boolean, set only by its challenge: a remember-cookie session or a user who had
  just enrolled had none and looped between the panel and a challenge with nothing pending.
  Now a remember-restored session is challenged like a parked one, enrolling passes the
  session, and the pass is `class|id`, so it never covers another account.
- **Storage is Fortify's**: `two_factor_secret` (`encrypt()`), `two_factor_recovery_codes`
  (encrypted JSON), `two_factor_confirmed_at`, plus `two_factor_last_used_step` for replay.
  A Fortify host keeps its enrolled users; the migration adds only the missing columns.
- **pragmarx/google2fa and bacon/bacon-qr-code are suggested, not required**: a host
  without 2FA does not carry them. `--2fa` prints the `composer require`.
- **Every change to the factor proves something**: turning it on takes the current
  password, then the first code; new recovery codes and turning it off take a code (TOTP or
  recovery). Recovery codes are shown once, flashed to the next render. The QR code is an
  SVG data URI in `displayImage`, so the section is plain DSL with no client block.
- **The profile page is a base page too, behind the panel stack**, not an `AuthPage`: it
  edits the signed-in user, so it needs `auth:{guard}`. `--auth` publishes it with the rest;
  `--profile` alone serves hosts with their own sign-in. Its user-menu entry follows the
  file (served subclass → entry), so there is no panel flag to keep in sync. Section-per-form
  `view()` takes the 2FA section as one more form.
- **Changing the email asks for the current password**, unlike Breeze and Filament: the
  email is where password resets go, so a hijacked session could otherwise take the
  account. The name alone saves without it.

## Why

Filament's package-registered auth pages are hard to customise; a Breeze-style full copy
never receives fixes. Subclasses of package bases give the host the file and the package
the behaviour. Throttle and session renewal are where a well-meant override opens a hole;
they stay callable and wrappable, and overriding them is the host's own call.
