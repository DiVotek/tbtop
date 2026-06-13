<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Tbtop\Admin\I18n\LocaleService;

final class LocaleController
{
    public function __invoke(Request $request): RedirectResponse
    {
        $available = LocaleService::availableLocales();

        $request->validate([
            'locale' => ['required', 'string', 'in:'.implode(',', $available)],
        ]);

        /** @var string $locale */
        $locale = $request->input('locale');

        session(['tbtop.locale' => $locale]);

        return redirect()->back();
    }
}
