<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorDisableTest extends TestCase
{
    use RefreshDatabase;

    public function test_disable_2fa_with_valid_otp_succeeds(): void
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);

        $validOtp = $g2fa->getCurrentOtp($secret);

        $response = $this->actingAs($user)->postJson('/two-factor/disable', [
            'code' => $validOtp,
        ]);

        $response->assertOk();

        $user->refresh();
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->two_factor_secret);
    }

    public function test_disable_2fa_with_wrong_code_fails(): void
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/two-factor/disable', [
            'code' => '000000',
        ]);

        $response->assertStatus(422);

        $user->refresh();
        $this->assertNotNull($user->two_factor_confirmed_at);
    }
}
