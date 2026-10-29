<?php

namespace Tbtop\Admin\Tests;

use PragmaRX\Google2FA\Google2FA;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;
use Tbtop\Admin\Tests\Fixtures\Panels\TwoFactorPanel;

/** The auth panel with the published challenge page, on a user table that ran the --2fa migration. */
class TwoFactorHttpTestCase extends AuthHttpTestCase
{
    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('tbtop-admin.panels', [TwoFactorPanel::class]);
    }

    protected function defineDatabaseMigrations(): void
    {
        parent::defineDatabaseMigrations();
        $migration = require __DIR__.'/../stubs/install/auth/two_factor_migration.php.stub';
        $migration->up();
    }

    /** Signs $user's second factor on with $secret, as a finished enrolment leaves it. */
    protected function enableTwoFactor(AuthUser $user, string $secret, array $recoveryCodes = ['first-code', 'second-code']): AuthUser
    {
        $user->forceFill([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $user;
    }

    /** The code an authenticator app shows for $secret at the app clock's time step. */
    protected function totp(string $secret): string
    {
        $google2fa = new Google2FA;

        return $google2fa->oathTotp($secret, intdiv(now()->getTimestamp(), $google2fa->getKeyRegeneration()));
    }
}
