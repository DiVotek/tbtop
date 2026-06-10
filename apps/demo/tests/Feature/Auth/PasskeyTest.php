<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Tests\TestCase;

class PasskeyTest extends TestCase
{
    use RefreshDatabase, PasskeyTestHelpers;

    public function test_passkey_register_options_endpoint_requires_auth(): void
    {
        $response = $this->getJson('/user/passkeys/options');

        $response->assertUnauthorized();
    }

    public function test_passkey_register_options_returns_challenge_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->getJson('/user/passkeys/options');

        $response->assertOk();
        $response->assertJsonStructure(['options' => ['challenge', 'rp', 'user']]);
    }

    public function test_passkey_login_options_endpoint_is_reachable(): void
    {
        $response = $this->getJson('/passkeys/login/options');

        $response->assertOk();
        $response->assertJsonStructure(['options' => ['challenge']]);
    }

    public function test_passkey_login_authenticates_user_via_webauthn_hook(): void
    {
        $user = User::factory()->create();

        $passkey = $user->passkeys()->create([
            'name' => 'Test key',
            'credential_id' => 'fake-credential-id',
            'credential' => [],
        ]);

        $this->mock(VerifyPasskey::class)
            ->shouldReceive('__invoke')
            ->once()
            ->andReturn($passkey);

        $this->withSession(['passkey.verification_options' => $this->makeVerificationOptionsJson()])
            ->postJson('/passkeys/login', ['credential' => $this->makeAssertionCredential()]);

        $this->assertAuthenticatedAs($user);
    }
}
