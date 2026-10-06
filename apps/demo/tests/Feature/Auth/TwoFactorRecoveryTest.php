<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** A consumed recovery code is covered in TwoFactorChallengeTest; this one checks it cannot be replayed. */
class TwoFactorRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_already_used_recovery_code_is_rejected(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => encrypt('SECRETSECRETKEY1'),
            'two_factor_recovery_codes' => encrypt(json_encode(['second-code-xyz2'])),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withSession(['auth.2fa.user_id' => $user->id]);

        $this->post('/admin/two-factor-challenge/forms/challenge', [
            'code' => 'valid-code-abc1',
        ])->assertSessionHasErrors('code');

        $this->assertGuest();
    }
}
