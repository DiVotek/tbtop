<?php

namespace App\Admin\Pages;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Nested under Settings via nav()['parent'] — proof of the nested-nav mechanism.
 * Its form shows Password::secret(): the stored SMTP password and API key are
 * never sent to the browser, only whether they are set (and the key's last four).
 */
class SettingsMailPage extends Page
{
    private const SECRETS = ['password', 'api_key'];

    public static function path(): string
    {
        return 'settings/mail';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Mail', 'order' => 2, 'parent' => SettingsPage::class];
    }

    public function title(): string
    {
        return 'Mail settings';
    }

    public function view(S $s): Node
    {
        return $s->stack([
            $s->displayText('Mail settings')->variant('heading'),
            $s->displayText('Nested under Site settings — see nav()[\'parent\'].')->variant('muted'),
            $s->form('mail', [
                $s->section(['title' => 'SMTP'], [
                    $s->text('host')->label('Host')->required(),
                    $s->password('password')->label('Password')->secret(),
                    $s->password('api_key')
                        ->label('Provider API key')
                        ->preview(fn (string $key): string => '…'.substr($key, -4))
                        ->clearable()
                        ->helperText('Stored encrypted. Leave it alone to keep the current key.'),
                ]),
                $s->action('save')->label('Save')->color('primary')->submit(),
            ])
                ->record($this->stored())
                ->onSubmit(function (ActionCtx $ctx): Effects {
                    $this->store($ctx->form);

                    return Effects::make()->notify('Mail settings saved');
                }),
        ]);
    }

    /** @return array<string, mixed> The settings, secrets decrypted, as an encrypted cast would give them. */
    private function stored(): array
    {
        $out = Cache::get('demo.mail', [
            'host' => 'smtp.example.com',
            'password' => null,
            'api_key' => Crypt::encryptString('re_demo_8f2a91c4'),
        ]);
        foreach (self::SECRETS as $key) {
            $out[$key] = is_string($out[$key] ?? null) ? Crypt::decryptString($out[$key]) : null;
        }

        return $out;
    }

    /** An absent secret key keeps the stored value; null (a clear) removes it. @param array<string, mixed> $form */
    private function store(array $form): void
    {
        $raw = Cache::get('demo.mail', []);
        foreach ($form as $key => $value) {
            $raw[$key] = in_array($key, self::SECRETS, true) && is_string($value) ? Crypt::encryptString($value) : $value;
        }
        Cache::forever('demo.mail', $raw);
    }
}
