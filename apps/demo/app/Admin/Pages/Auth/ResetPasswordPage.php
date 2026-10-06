<?php

namespace App\Admin\Pages\Auth;

/**
 * New-password screen at {prefix}/reset-password/{token}, opened from the
 * reset mail. Behaviour lives in the package base. Hooks:
 *
 *   view(S $s)        the screen
 *   passwordRules()   rules for the new password (default: Password::defaults())
 *   broker()          the password broker from config/auth.php
 */
class ResetPasswordPage extends \Tbtop\Admin\Auth\ResetPasswordPage {}
