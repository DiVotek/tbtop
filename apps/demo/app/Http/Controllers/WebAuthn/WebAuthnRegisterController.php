<?php

namespace App\Http\Controllers\WebAuthn;

use Illuminate\Http\JsonResponse;
use Laravel\Passkeys\Contracts\PasskeyRegistrationResponse;
use Laravel\Passkeys\Passkey;

class WebAuthnRegisterController implements PasskeyRegistrationResponse
{
    private ?Passkey $passkey = null;

    /**
     * After a successful passkey registration, log and return success.
     */
    public function toResponse($request): JsonResponse
    {
        \Log::info('auth.passkey.registered', ['user_id' => auth()->id()]);

        return response()->json(['status' => 'passkey-registered']);
    }

    public function withPasskey(Passkey $passkey): static
    {
        $this->passkey = $passkey;

        return $this;
    }
}
