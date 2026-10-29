<?php

namespace Tbtop\Admin\Tests\Fixtures\Auth;

use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail;

/** The same users table, opted in to email verification. */
class VerifyingUser extends AuthUser implements MustVerifyEmail
{
    use MustVerifyEmailTrait;

    protected $casts = ['email_verified_at' => 'datetime'];
}
