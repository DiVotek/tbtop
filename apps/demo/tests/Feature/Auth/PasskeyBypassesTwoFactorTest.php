<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laragear\WebAuthn\Auth\WebAuthnUserProvider;
use Laragear\WebAuthn\Models\WebAuthnCredential;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class PasskeyBypassesTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        WebAuthnUserProvider::$validateUsing = null;
        parent::tearDown();
    }

    public function test_passkey_login_of_2fa_user_bypasses_challenge_and_accesses_dashboard(): void
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);

        WebAuthnUserProvider::$validateUsing = function ($authUser, array $credentials) use ($user): bool {
            return isset($credentials['id']) && $authUser->id === $user->id;
        };

        $credential = new WebAuthnCredential;
        $credential->forceFill([
            'id' => 'passkey-credential-id',
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

        $loginResponse = $this->postJson('/webauthn/login', [
            'id' => 'passkey-credential-id',
            'rawId' => base64_encode('passkey-credential-id'),
            'response' => [
                'authenticatorData' => base64_encode('fake'),
                'clientDataJSON' => base64_encode('{}'),
                'signature' => base64_encode('sig'),
                'userHandle' => null,
            ],
            'type' => 'public-key',
        ]);

        $loginResponse->assertStatus(204);
        $this->assertAuthenticatedAs($user);

        // After passkey login, session must mark 2FA as completed so admin is accessible.
        $this->assertTrue(session('auth.2fa.completed', false));
    }
}
