<?php

namespace App\Admin\Pages\Auth;

/**
 * Password reset request at {prefix}/forgot-password; mails a link to the
 * panel's ResetPasswordPage. Behaviour lives in the package base. Hooks:
 *
 *   view(S $s)    the screen
 *
 * Delete this file (and ResetPasswordPage) to drop password reset.
 */
class ForgotPasswordPage extends \Tbtop\Admin\Auth\ForgotPasswordPage {}
