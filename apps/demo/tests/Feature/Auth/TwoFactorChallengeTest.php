<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
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

        $response = $this->post('/admin/login/forms/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertRedirect('/admin/two-factor-challenge');
        $response->assertSessionHas('auth.2fa.user_id', $user->id);
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

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => '000000',
        ])->assertSessionHasErrors('code');

        $this->assertGuest();
    }

    public function test_valid_otp_on_challenge_completes_authentication(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();

        $this->withSession(['auth.2fa.user_id' => $user->id]);
        $previousSessionId = session()->getId();

        $response = $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $g2fa->getCurrentOtp($secret),
        ]);

        $response->assertRedirect('/admin/dashboard');
        $this->assertAuthenticatedAs($user);
        $response->assertSessionMissing('auth.2fa.user_id');
        $response->assertSessionHas('auth.2fa.completed', true);
        $this->assertNotSame($previousSessionId, session()->getId());
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

    public function test_sixth_attempt_within_a_minute_is_refused_and_drops_the_pending_login(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();
        $this->freezeTime();

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        foreach (range(1, 5) as $_) {
            $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => '000000'])
                ->assertSessionHasErrors('code');
        }

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $g2fa->oathTotp($secret, intdiv(now()->getTimestamp(), 30)),
        ])->assertSessionHasErrors('code')->assertSessionMissing('auth.2fa.user_id');

        $this->assertGuest();
    }

    public function test_the_fifth_wrong_code_drops_the_pending_login_for_good(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();
        $this->freezeTime();

        $this->withSession(['auth.2fa.user_id' => $user->id]);
        foreach (range(1, 5) as $_) {
            $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => '000000']);
        }

        // After the throttle window a valid code still needs a fresh password sign-in.
        $this->travel(2)->minutes();
        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => $g2fa->oathTotp($secret, intdiv(now()->getTimestamp(), 30)),
        ])->assertSessionMissing('auth.2fa.user_id');

        $this->assertGuest();
    }

    public function test_a_used_otp_cannot_be_replayed_within_its_window(): void
    {
        [$user, $g2fa, $secret] = $this->userWithTwoFactor();
        $this->freezeTime();
        $code = $g2fa->oathTotp($secret, intdiv(now()->getTimestamp(), 30));

        $this->withSession(['auth.2fa.user_id' => $user->id]);
        $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => $code])
            ->assertRedirect('/admin/dashboard');

        Auth::logout();
        $this->withSession(['auth.2fa.user_id' => $user->id]);
        $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => $code])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }

    public function test_a_re_enrolled_secret_accepts_its_first_code_in_the_same_step(): void
    {
        $this->freezeTime();
        $step = intdiv(now()->getTimestamp(), 30);
        // Disabled 2FA whose old secret was last used in this very time step.
        $user = User::factory()->create(['two_factor_last_used_step' => $step]);

        $secret = $this->actingAs($user)->postJson('/two-factor/setup')->json('secret');
        $code = (new Google2FA)->oathTotp($secret, $step);
        $this->postJson('/two-factor/confirm', ['code' => $code])->assertOk();

        Auth::logout();
        $this->withSession(['auth.2fa.user_id' => $user->id]);
        // The enrolment code was consumed; the next step's code signs in.
        $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => $code])
            ->assertSessionHasErrors('code');
        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => (new Google2FA)->oathTotp($secret, $step + 1),
        ])->assertRedirect('/admin/dashboard');
    }
}
