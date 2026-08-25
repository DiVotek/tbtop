<?php

use Illuminate\Support\Arr;
use Tbtop\Admin\I18n\LocaleService;

it('ships every client default message in the English and Ukrainian PHP locales', function (): void {
    $source = file_get_contents(__DIR__.'/../../client/src/i18n/defaultMessages.ts');
    preg_match_all('/^\s*"([^"]+)"\s*:/m', (string) $source, $matches);
    $clientKeys = array_values(array_unique($matches[1]));
    $missingByLocale = [];

    foreach (['en', 'uk'] as $locale) {
        $messages = Arr::dot(require __DIR__."/../resources/lang/{$locale}/admin.php");
        $missing = array_values(array_diff($clientKeys, array_keys($messages)));

        if ($missing !== []) {
            sort($missing);
            $missingByLocale[$locale] = $missing;
        }
    }

    $details = array_map(
        static fn (string $locale, array $keys): string => $locale.': '.implode(', ', $keys),
        array_keys($missingByLocale),
        $missingByLocale,
    );

    expect($missingByLocale)->toBe([], "Missing client default keys:\n".implode("\n", $details))
        ->and(LocaleService::messagesFor('uk'))->toHaveKey('field.otp.label');
});
