<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passkeys\Actions\VerifyPasskey;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class PasskeyBypassesTwoFactorTest extends TestCase
{
    use RefreshDatabase, PasskeyTestHelpers;

    public function test_passkey_login_of_2fa_user_bypasses_challenge_and_accesses_dashboard(): void
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);

        $passkey = $user->passkeys()->create([
            'name' => 'Test key',
            'credential_id' => 'passkey-credential-id',
            'credential' => [],
        ]);

        $this->mock(VerifyPasskey::class)
            ->shouldReceive('__invoke')
            ->once()
            ->andReturn($passkey);

        $this->withSession(['passkey.verification_options' => $this->makeVerificationOptionsJson()])
            ->postJson('/passkeys/login', ['credential' => $this->makeAssertionCredential()]);

        $this->assertAuthenticatedAs($user);

        // After passkey login, session must mark 2FA as completed so admin is accessible.
        $this->assertTrue(session('auth.2fa.completed', false));
    }
}
