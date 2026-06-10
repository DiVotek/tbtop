<?php

namespace App\Http\Controllers\WebAuthn;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse;

class WebAuthnLoginController implements PasskeyLoginResponse
{
    /**
     * After a successful passkey login, mark 2FA as completed and redirect.
     */
    public function toResponse($request): JsonResponse
    {
        /** @var Request $request */
        $request->session()->put('auth.2fa.completed', true);

        \Log::info('auth.passkey.login', ['user_id' => auth()->id()]);

        return response()->json([
            'redirect' => redirect()->intended(config('passkeys.redirect', '/'))->getTargetUrl(),
        ]);
    }
}
