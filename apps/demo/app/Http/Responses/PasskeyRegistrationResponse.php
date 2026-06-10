<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Passkeys\Contracts\PasskeyRegistrationResponse as PasskeyRegistrationResponseContract;
use Laravel\Passkeys\Passkey;

class PasskeyRegistrationResponse implements PasskeyRegistrationResponseContract
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
