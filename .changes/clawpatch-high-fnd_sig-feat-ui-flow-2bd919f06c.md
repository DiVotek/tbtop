# fix(auth): log the pending user in when the 2FA challenge succeeds

touches: two-factor challenge

> ⚠️ **Auth** `TwoFactorChallengeController::store` now calls
> `Auth::guard('web')->login($user)` and regenerates the session on a valid OTP.
> Strictly more authentication than before, not less — the endpoint already
> required a verified OTP to reach this point.

A correct OTP cleared the pending user id and set `auth.2fa.completed`, but never
authenticated anyone. The visitor was redirected to the dashboard as a guest and
bounced by the auth middleware. The DSL challenge page did this correctly; only the
standard controller path was broken.

```mermaid
flowchart LR
    subgraph demo["apps/demo"]
        otp(["POST 2FA challenge<br/><small>valid OTP</small>"]):::unchanged
        ctrl["TwoFactorChallengeController::store<br/>+login +session regenerate<br/><small>Auth/TwoFactorChallengeController.php</small>"]:::changed
        dsl(["TwoFactorChallengePage::complete<br/><small>already logged in</small>"]):::unchanged
        guard(["RequireFullAuth<br/><small>reads auth.2fa.completed</small>"]):::unchanged
        dash(["dashboard"]):::unchanged
    end

    otp --> ctrl
    ctrl ==>|"hero: pending user becomes authenticated"| guard
    dsl --> guard
    guard --> dash

    classDef changed fill:#0d3b1e,stroke:#2ea043,color:#fff
    classDef touched fill:#21262d,stroke:#8b949e,stroke-dasharray:4,color:#ddd
    classDef unchanged fill:#21262d,stroke:#484f58,color:#aaa
    classDef removed fill:#3b0d0d,stroke:#da3633,color:#fff
```

The session is regenerated after login, which is the fixation-safe order.

**Ordering note:** this path does `login → forget → regenerate → put`, while the DSL
page does `login → forget → put → regenerate`. `Illuminate\Session\Store::regenerate()`
only swaps the id and CSRF token — it migrates attributes rather than clearing them —
so both orders leave the same session state. Worth converging one day for readability,
not a defect.

**Read by eye:**
- `apps/demo/app/Http/Controllers/Auth/TwoFactorChallengeController.php`

**Verification:**
- `vendor/bin/pest tests/Feature/Auth` on the patch branch → 34 passed, matching base.
- `Auth::guard('web')` matches `config/auth.php`'s default guard and the guard used by
  `AuthenticatedSessionController`.
- Added assertions are red on base: with no `login()` call, `assertAuthenticatedAs`
  fails there.
