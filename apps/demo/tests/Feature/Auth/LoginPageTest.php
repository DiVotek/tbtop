<?php

namespace Tests\Feature\Auth;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LoginPageTest extends TestCase
{
    public function test_login_page_renders_on_bare_auth_layout(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page->component('auth/login'));
    }

    public function test_login_page_includes_passkey_option(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->has('hasPasskeys')
        );
    }
}
