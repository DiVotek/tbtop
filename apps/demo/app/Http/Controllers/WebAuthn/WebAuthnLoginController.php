<?php

namespace App\Http\Controllers\WebAuthn;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Response;
use Laragear\WebAuthn\Http\Requests\AssertedRequest;
use Laragear\WebAuthn\Http\Requests\AssertionRequest;

class WebAuthnLoginController
{
    public function options(AssertionRequest $request): Responsable
    {
        return $request->toVerify(
            $request->validate(['email' => 'sometimes|email|string'])
        );
    }

    public function login(AssertedRequest $request): Response
    {
        $user = $request->login();

        if (! $user) {
            return response()->noContent(422);
        }

        $request->session()->put('auth.2fa.completed', true);

        \Log::info('auth.passkey.login', ['user_id' => $user->id]);

        return response()->noContent(204);
    }
}
