<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageGatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_gates_admin_role_sees_gated_dashboard_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $this->get('/admin/dashboard')->assertOk();
    }

    public function test_page_gates_user_role_gets_403_on_gated_dashboard_page(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $this->get('/admin/dashboard')->assertForbidden();
    }

    public function test_page_gates_ungated_posts_page_accessible_for_admin_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $this->get('/admin/posts')->assertOk();
    }

    public function test_page_gates_ungated_posts_page_accessible_for_user_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $this->get('/admin/posts')->assertOk();
    }
}
