<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorEnrollTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_factor_enroll_issues_secret_and_qr(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/two-factor/setup');

        $response->assertOk();
        $response->assertJsonStructure(['qr_svg', 'secret']);

        $user->refresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
    }

    public function test_two_factor_confirm_with_valid_otp_enables_and_returns_recovery_codes(): void
    {
        $user = User::factory()->create();
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user->forceFill(['two_factor_secret' => encrypt($secret)])->save();

        $validOtp = $g2fa->getCurrentOtp($secret);

        $response = $this->actingAs($user)->postJson('/two-factor/confirm', [
            'code' => $validOtp,
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['recovery_codes']);
        $codes = $response->json('recovery_codes');
        $this->assertCount(10, $codes);

        $user->refresh();
        $this->assertNotNull($user->two_factor_confirmed_at);
        $this->assertNotNull($user->two_factor_recovery_codes);
    }

    public function test_two_factor_confirm_with_invalid_otp_is_rejected(): void
    {
        $user = User::factory()->create();
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user->forceFill(['two_factor_secret' => encrypt($secret)])->save();

        $response = $this->actingAs($user)->postJson('/two-factor/confirm', [
            'code' => '000000',
        ]);

        $response->assertStatus(422);

        $user->refresh();
        $this->assertNull($user->two_factor_confirmed_at);
    }
}
