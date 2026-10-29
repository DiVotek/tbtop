<?php

namespace App\Admin\Pages\Auth;

/**
 * Second sign-in step at {prefix}/two-factor-challenge: a code from the
 * authenticator app or a recovery code. While it exists, the login sends a
 * user with a second factor here, the panel sends back any session that has
 * not passed it, and the profile page offers to turn it on. Hooks:
 *
 *   view(S $s)                  the screen
 *   redirectTo(ActionCtx $ctx)  where the user lands after the code
 *   challenge(ActionCtx $ctx)   the verification core; call it from a rebuilt view()'s onSubmit
 *
 * Delete this file to turn two-factor sign-in off for the panel.
 */
class TwoFactorChallengePage extends \Tbtop\Admin\Auth\TwoFactorChallengePage {}
