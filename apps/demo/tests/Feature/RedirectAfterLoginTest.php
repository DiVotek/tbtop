<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A guest who requests a deep admin URL must land back on it after signing in,
 * not on the dashboard. RequireFullAuth stashes url.intended; the DSL login
 * page reads it (it returns a URL string, so redirect()->intended() is not
 * available to it).
 */
class RedirectAfterLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_bounced_guest_returns_to_the_requested_page_after_login()
    {
        $user = User::factory()->create();

        $this->get('/admin/posts')->assertRedirect('/admin/login');

        $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/admin/posts');
    }

    public function test_login_without_an_intended_url_lands_on_the_dashboard()
    {
        $user = User::factory()->create();

        $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/admin/dashboard');
    }

    public function test_the_intended_url_is_not_reused_by_a_later_login()
    {
        $user = User::factory()->create();

        $this->get('/admin/posts')->assertRedirect('/admin/login');
        $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/admin/posts');

        $this->post('/admin/logout');

        $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/admin/dashboard');
    }
}
