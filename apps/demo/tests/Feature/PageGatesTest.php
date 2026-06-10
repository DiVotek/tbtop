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

    public function test_page_gates_user_role_gets_403_on_gated_dashboard_data_endpoint(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $this->getJson('/admin/dashboard/data/byStatus')->assertForbidden();
    }

    public function test_page_gates_admin_role_can_access_gated_dashboard_data_endpoint(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);

        $this->getJson('/admin/dashboard/data/byStatus')->assertOk();
    }

    public function test_page_gates_user_role_gets_403_on_gated_dashboard_form_submit(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        // Gate check fires before form resolution — 403 regardless of form existence.
        $this->postJson('/admin/dashboard/forms/settings', [])->assertForbidden();
    }

    public function test_page_gates_ungated_posts_table_endpoint_accessible_for_user_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user);

        $this->getJson('/admin/posts/tables/posts')->assertOk();
    }
}
