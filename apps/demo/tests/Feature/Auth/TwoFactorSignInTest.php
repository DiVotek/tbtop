<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * The demo runs the package's two-factor sign-in (admin:install --2fa): the
 * profile page turns it on, the login sends the user to the challenge.
 */
class TwoFactorSignInTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_turns_the_factor_on_from_the_profile_and_then_signs_in_with_a_code(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->from('/admin/profile')->post('/admin/profile/forms/two_factor_enable', ['current_password' => 'password'])
            ->assertSessionHasNoErrors();
        $secret = decrypt($user->fresh()->two_factor_secret);
        $this->from('/admin/profile')->post('/admin/profile/forms/two_factor_confirm', ['code' => $this->totp($secret)])
            ->assertSessionHasNoErrors();
        $this->get('/admin/posts')->assertOk();
        $this->post('/admin/logout');

        $this->travel(1)->minutes();
        $this->post('/admin/login/forms/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect('/admin/two-factor-challenge');
        $this->assertGuest();

        $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => $this->totp($secret)])
            ->assertRedirect('/admin');
        $this->assertAuthenticatedAs($user);
    }

    public function test_a_remembered_session_owes_the_code_again(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_recovery_codes' => encrypt(json_encode(['spare-code'])),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)->get('/admin/posts')->assertRedirect('/admin/two-factor-challenge');
        $this->post('/admin/two-factor-challenge/forms/challenge', ['code' => 'spare-code'])->assertRedirect('/admin/posts');
        $this->get('/admin/posts')->assertOk();
    }

    private function totp(string $secret): string
    {
        $google2fa = new Google2FA;

        return $google2fa->oathTotp($secret, intdiv(now()->getTimestamp(), $google2fa->getKeyRegeneration()));
    }
}
