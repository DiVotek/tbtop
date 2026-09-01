<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorChallengeTest extends TestCase
{
    use RefreshDatabase;

    private function userWithTwoFactor(): array
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['code-a-1234567', 'code-b-1234567'])),
            'two_factor_confirmed_at' => now(),
        ]);

        return [$user, $g2fa, $secret];
    }

    public function test_password_login_with_2fa_enabled_redirects_to_challenge(): void
    {
        [$user] = $this->userWithTwoFactor();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
    }

    public function test_admin_routes_blocked_when_2fa_challenge_pending(): void
    {
        [$user] = $this->userWithTwoFactor();

        $response = $this->actingAs($user)->get('/admin/dashboard');

        $response->assertRedirect(route('tbtop.admin.two-factor-challenge-page'));
    }

    public function test_wrong_otp_on_challenge_is_rejected(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $response = $this->postJson('/two-factor-challenge', [
            'code' => '000000',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_valid_otp_on_challenge_completes_authentication(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $validOtp = $g2fa->getCurrentOtp($secret);

        $response = $this->post('/two-factor-challenge', [
            'code' => $validOtp,
        ]);

        $response->assertRedirect(route('dashboard'));
    }

    public function test_admin_dsl_challenge_accepts_a_recovery_code(): void
    {
        [$user] = $this->userWithTwoFactor();
        $codes = json_decode(decrypt($user->two_factor_recovery_codes), true);

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $codes[0],
        ])->assertRedirect('/admin/dashboard');

        $this->assertAuthenticatedAs($user);

        $user->refresh();
        $remaining = json_decode(decrypt($user->two_factor_recovery_codes), true);
        $this->assertNotContains($codes[0], $remaining);
        $this->assertContains($codes[1], $remaining);
    }

    public function test_admin_dsl_challenge_accepts_a_totp_code(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $g2fa->getCurrentOtp($secret),
        ])->assertRedirect('/admin/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_admin_dsl_challenge_returns_to_the_intended_url_after_a_recovery_code(): void
    {
        [$user] = $this->userWithTwoFactor();
        $codes = json_decode(decrypt($user->two_factor_recovery_codes), true);

        $this->get('/admin/posts')->assertRedirect('/admin/login');

        $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/admin/two-factor-challenge');

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $codes[0],
        ])->assertRedirect('/admin/posts');
    }
}
