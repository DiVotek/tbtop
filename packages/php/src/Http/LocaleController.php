<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class LocaleController
{
    public function __invoke(Request $request): RedirectResponse
    {
        $available = (array) config('tbtop-admin.locales', ['en']);

        $request->validate([
            'locale' => ['required', 'string', 'in:'.implode(',', $available)],
        ]);

        /** @var string $locale */
        $locale = $request->input('locale');

        session(['tbtop.locale' => $locale]);

        return redirect()->back();
    }
}
