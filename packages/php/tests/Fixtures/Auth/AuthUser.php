<?php

namespace Tbtop\Admin\Tests\Fixtures\Auth;

use Illuminate\Foundation\Auth\User;
use Illuminate\Notifications\Notifiable;

class AuthUser extends User
{
    use Notifiable;

    protected $table = 'users';

    protected $guarded = [];

    protected $hidden = ['password', 'remember_token'];
}
