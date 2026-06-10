<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $passkeys = $user->passkeys()
            ->orderByDesc('last_used_at')
            ->get(['id', 'name', 'last_used_at', 'created_at'])
            ->toArray();

        return Inertia::render('settings/security', [
            'twoFactorEnabled' => $user->hasTwoFactorEnabled(),
            'passkeys' => $passkeys,
        ]);
    }
}
