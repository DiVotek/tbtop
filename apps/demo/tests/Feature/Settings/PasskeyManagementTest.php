<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasskeyManagementTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Scenario 1
    // -------------------------------------------------------------------------

    public function test_security_page_lists_user_passkeys_with_name_and_last_used(): void
    {
        $user = User::factory()->create();

        $passkey = $user->passkeys()->create([
            'name' => 'My MacBook',
            'credential_id' => 'cred-id-1',
            'credential' => [],
            'last_used_at' => '2024-01-15 10:30:00',
        ]);

        $response = $this->actingAs($user)->get('/settings/security');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/security')
            ->has('passkeys', 1)
            ->where('passkeys.0.id', $passkey->id)
            ->where('passkeys.0.name', 'My MacBook')
            ->has('passkeys.0.last_used_at')
            ->missing('passkeys.0.credential')
            ->missing('passkeys.0.credential_id')
        );
    }

    // -------------------------------------------------------------------------
    // Scenario 3
    // -------------------------------------------------------------------------

    public function test_register_options_endpoint_redirects_to_password_confirm_when_unconfirmed(): void
    {
        $user = User::factory()->create();

        // Browser (non-JSON) request without password confirmation redirects.
        $response = $this->actingAs($user)->get('/user/passkeys/options');

        $response->assertRedirectToRoute('password.confirm');
    }

    public function test_register_options_endpoint_succeeds_when_password_confirmed(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->getJson('/user/passkeys/options');

        $response->assertOk();
        $response->assertJsonStructure(['options' => ['challenge', 'rp', 'user']]);
    }

    // -------------------------------------------------------------------------
    // Scenario 2
    // -------------------------------------------------------------------------

    public function test_delete_passkey_removes_credential_when_password_confirmed(): void
    {
        $user = User::factory()->create();

        $passkey = $user->passkeys()->create([
            'name' => 'Test Key',
            'credential_id' => 'cred-del-1',
            'credential' => [],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->deleteJson("/user/passkeys/{$passkey->id}")
            ->assertOk();

        $this->assertDatabaseMissing('passkeys', ['id' => $passkey->id]);
    }

    public function test_delete_passkey_requires_authentication(): void
    {
        $user = User::factory()->create();

        $passkey = $user->passkeys()->create([
            'name' => 'Test Key',
            'credential_id' => 'cred-del-2',
            'credential' => [],
        ]);

        $this->deleteJson("/user/passkeys/{$passkey->id}")
            ->assertUnauthorized();
    }

    public function test_delete_passkey_requires_password_confirmation(): void
    {
        $user = User::factory()->create();

        $passkey = $user->passkeys()->create([
            'name' => 'Test Key',
            'credential_id' => 'cred-del-3',
            'credential' => [],
        ]);

        // JSON callers receive 423 Locked from the password.confirm middleware.
        $this->actingAs($user)
            ->deleteJson("/user/passkeys/{$passkey->id}")
            ->assertStatus(423);
    }

    public function test_delete_passkey_prevents_deleting_another_users_passkey(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $passkey = $owner->passkeys()->create([
            'name' => 'Owner Key',
            'credential_id' => 'cred-del-4',
            'credential' => [],
        ]);

        $this->actingAs($attacker)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->deleteJson("/user/passkeys/{$passkey->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('passkeys', ['id' => $passkey->id]);
    }
}
