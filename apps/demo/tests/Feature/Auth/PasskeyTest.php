<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laragear\WebAuthn\Auth\WebAuthnUserProvider;
use Laragear\WebAuthn\Models\WebAuthnCredential;
use Tests\TestCase;

class PasskeyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        WebAuthnUserProvider::$validateUsing = null;
        parent::tearDown();
    }

    public function test_passkey_register_options_endpoint_requires_auth(): void
    {
        $response = $this->post('/webauthn/register/options');

        $response->assertStatus(403);
    }

    public function test_passkey_register_options_returns_challenge_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/webauthn/register/options');

        $response->assertOk();
        $response->assertJsonStructure(['challenge', 'rp', 'user']);
    }

    public function test_passkey_login_options_endpoint_is_reachable(): void
    {
        $response = $this->postJson('/webauthn/login/options');

        $response->assertOk();
        $response->assertJsonStructure(['challenge']);
    }

    public function test_passkey_login_authenticates_user_via_webauthn_hook(): void
    {
        $user = User::factory()->create();

        WebAuthnUserProvider::$validateUsing = function ($authUser, array $credentials) use ($user): bool {
            return isset($credentials['id']) && $authUser->id === $user->id;
        };

        $credential = new WebAuthnCredential;
        $credential->forceFill([
            'id' => 'fake-credential-id',
            'user_id' => $user->id,
            'authenticatable_id' => $user->id,
            'authenticatable_type' => User::class,
            'rp_id' => 'localhost',
            'origin' => 'http://localhost',
            'aaguid' => '00000000-0000-0000-0000-000000000000',
            'public_key' => base64_encode('fake-public-key'),
            'attestation_format' => 'none',
            'certificates' => '[]',
            'counter' => 0,
        ]);
        $credential->save();

        $response = $this->postJson('/webauthn/login', [
            'id' => 'fake-credential-id',
            'rawId' => base64_encode('fake-credential-id'),
            'response' => [
                'authenticatorData' => base64_encode('fake'),
                'clientDataJSON' => base64_encode('{}'),
                'signature' => base64_encode('sig'),
                'userHandle' => null,
            ],
            'type' => 'public-key',
        ]);

        $response->assertStatus(204);
        $this->assertAuthenticatedAs($user);
    }
}
