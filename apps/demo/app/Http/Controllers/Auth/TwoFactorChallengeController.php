<?php

namespace App\Http\Controllers\Auth;

use App\Auth\TwoFactorVerifier;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function __construct(private readonly TwoFactorVerifier $verifier) {}

    public function show(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('auth.2fa.user_id')) {
            return redirect()->route('tbtop.admin.login-page');
        }

        return Inertia::render('auth/two-factor-challenge');
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $userId = $request->session()->get('auth.2fa.user_id');

        if (! $userId) {
            throw ValidationException::withMessages(['code' => 'Session expired. Please login again.']);
        }

        $user = User::findOrFail($userId);

        if (! $this->verifier->verify($user, $request->input('code'))) {
            \Log::warning('auth.2fa.challenge_failed', ['user_id' => $user->id]);
            throw ValidationException::withMessages(['code' => 'Invalid verification code.']);
        }

        $request->session()->forget('auth.2fa.user_id');
        $request->session()->put('auth.2fa.completed', true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
