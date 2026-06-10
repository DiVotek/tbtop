<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRecoveryCodes(array $codes = ['valid-code-abc1']): User
    {
        return User::factory()->create([
            'two_factor_secret' => encrypt('SECRETSECRETKEY1'),
            'two_factor_recovery_codes' => encrypt(json_encode($codes)),
            'two_factor_confirmed_at' => now(),
        ]);
    }

    public function test_valid_recovery_code_passes_challenge_and_is_consumed(): void
    {
        $user = $this->userWithRecoveryCodes(['valid-code-abc1', 'second-code-xyz2']);

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $response = $this->post('/two-factor-challenge', [
            'code' => 'valid-code-abc1',
        ]);

        $response->assertRedirect(route('dashboard'));

        $user->refresh();
        $remaining = json_decode(decrypt($user->two_factor_recovery_codes), true);
        $this->assertNotContains('valid-code-abc1', $remaining);
        $this->assertContains('second-code-xyz2', $remaining);
    }

    public function test_already_used_recovery_code_is_rejected(): void
    {
        $user = $this->userWithRecoveryCodes(['second-code-xyz2']);

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $response = $this->postJson('/two-factor-challenge', [
            'code' => 'valid-code-abc1',
        ]);

        $response->assertStatus(422);
    }
}
