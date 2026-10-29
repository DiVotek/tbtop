<?php

use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;

/** Turning the second factor on and off from the profile page of a panel that serves the challenge. */
beforeEach(function () {
    $this->user = AuthUser::create(['name' => 'Olena', 'email' => 'olena@example.com', 'password' => Hash::make('secret-pass')]);
    $this->actingAs($this->user, 'staff');
});

function profileProps(): string
{
    return json_encode(test()->get('/admin/profile', ['X-Inertia' => 'true'])->assertOk()->json('props'));
}

function submitTwoFactor(string $form, array $data): TestResponse
{
    return test()->from('/admin/profile')->post("/admin/profile/forms/{$form}", $data);
}

function pendingSecret(AuthUser $user): string
{
    return decrypt($user->fresh()->two_factor_secret);
}

it('starts enrolment only with the current password', function () {
    expect(profileProps())->toContain('two_factor_enable');

    submitTwoFactor('two_factor_enable', ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
    expect($this->user->fresh()->two_factor_secret)->toBeNull();

    submitTwoFactor('two_factor_enable', ['current_password' => 'secret-pass'])->assertSessionHasNoErrors();
    expect(profileProps())->toContain('two_factor_confirm')->toContain('data:image\/svg+xml;base64,')
        ->and($this->user->fresh()->two_factor_confirmed_at)->toBeNull();
});

it('turns the factor on with the first code, shows the recovery codes once and does not challenge this session', function () {
    submitTwoFactor('two_factor_enable', ['current_password' => 'secret-pass']);

    submitTwoFactor('two_factor_confirm', ['code' => '000000'])->assertSessionHasErrors(['code' => 'Invalid code.']);
    submitTwoFactor('two_factor_confirm', ['code' => $this->totp(pendingSecret($this->user))])->assertSessionHasNoErrors();

    $codes = json_decode(decrypt($this->user->fresh()->two_factor_recovery_codes), true);
    expect($this->user->fresh()->two_factor_confirmed_at)->not->toBeNull()
        ->and($codes)->toHaveCount(8)
        ->and(profileProps())->toContain($codes[0])->toContain('two_factor_manage')
        ->and(profileProps())->not->toContain($codes[0]);
    $this->get('/admin/nav-demo')->assertOk();
});

it('cancels a pending enrolment', function () {
    submitTwoFactor('two_factor_enable', ['current_password' => 'secret-pass']);

    $this->postJson('/admin/profile/actions/cancel', ['payload' => ['form' => []]])->assertOk()->assertJsonPath('effects.0.kind', 'redirect');

    expect($this->user->fresh()->two_factor_secret)->toBeNull();
});

it('renews the recovery codes and turns the factor off, each with a code', function () {
    $this->enableTwoFactor($this->user, 'JBSWY3DPEHPK3PXP', ['old-code', 'spare-code']);
    $this->withSession(['tbtop_two_factor.passed.staff' => AuthUser::class.'|'.$this->user->getKey()]);

    submitTwoFactor('two_factor_manage', ['code' => 'nope'])->assertSessionHasErrors('code');
    submitTwoFactor('two_factor_manage', ['code' => 'old-code'])->assertSessionHasNoErrors();
    $codes = json_decode(decrypt($this->user->fresh()->two_factor_recovery_codes), true);
    expect($codes)->toHaveCount(8)->not->toContain('spare-code');

    $this->postJson('/admin/profile/actions/disable', ['payload' => ['form' => ['code' => $codes[0]]]])->assertOk();

    expect($this->user->fresh())->two_factor_confirmed_at->toBeNull()->two_factor_secret->toBeNull();
});
