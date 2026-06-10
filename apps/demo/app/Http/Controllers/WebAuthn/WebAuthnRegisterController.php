<?php

namespace App\Http\Controllers\WebAuthn;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Response;
use Laragear\WebAuthn\Http\Requests\AttestationRequest;
use Laragear\WebAuthn\Http\Requests\AttestedRequest;

class WebAuthnRegisterController
{
    public function options(AttestationRequest $request): Responsable
    {
        return $request->fastRegistration()->toCreate();
    }

    public function register(AttestedRequest $request): Response
    {
        $request->save(fn ($credential) => $credential->alias = $request->input('alias'));

        \Log::info('auth.passkey.registered', ['user_id' => $request->user()->id]);

        return response()->noContent();
    }
}
