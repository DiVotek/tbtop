<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function __construct(private readonly Google2FA $google2fa) {}

    public function show(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('auth.2fa.user_id')) {
            return redirect()->route('login');
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

        if (! $this->validateCodeOrRecovery($user, $request->input('code'))) {
            \Log::warning('auth.2fa.challenge_failed', ['user_id' => $user->id]);
            throw ValidationException::withMessages(['code' => 'Invalid verification code.']);
        }

        $request->session()->forget('auth.2fa.user_id');
        $request->session()->put('auth.2fa.completed', true);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function validateCodeOrRecovery(User $user, string $code): bool
    {
        if (ctype_digit($code) && strlen($code) === 6) {
            try {
                $secret = decrypt($user->two_factor_secret);
                if ($this->google2fa->verifyKey($secret, $code)) {
                    return true;
                }
            } catch (\Throwable) {
                // Fall through to recovery code check.
            }
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = json_decode(decrypt($user->two_factor_recovery_codes), true);
        $index = array_search($code, $codes, true);

        if ($index === false) {
            return false;
        }

        array_splice($codes, (int) $index, 1);
        $user->forceFill(['two_factor_recovery_codes' => encrypt(json_encode($codes))])->save();

        \Log::info('auth.2fa.recovery_code_used', ['user_id' => $user->id]);

        return true;
    }
}
