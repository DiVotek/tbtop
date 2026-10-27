<?php

namespace App\Admin\Pages\Auth;

/**
 * The signed-in user's profile at {prefix}/profile: name, email and password.
 * While it exists, the user menu links to it. Behaviour lives in the package
 * base. Hooks:
 *
 *   view(S $s)                 the screen; append your own sections after parent::view()
 *   profileForm(S $s), passwordForm(S $s)   the two forms
 *   profileRules($user)        rules for name and email (default: unique email)
 *   passwordRules()            rules for the new password (default: Password::defaults())
 *
 * Delete this file to drop the page and its menu entry.
 */
class ProfilePage extends \Tbtop\Admin\Auth\ProfilePage {}
