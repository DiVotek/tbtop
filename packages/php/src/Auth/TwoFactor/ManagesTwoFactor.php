<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Actions\ActionCtx;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Auth\TwoFactorChallengePage;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\S;

/**
 * The profile page's two-factor section, shown while the panel serves a
 * TwoFactorChallengePage subclass. Off: the current password starts
 * enrolment. Pending: QR code and setup key, confirmed by the first code.
 * On: recovery codes renewed or the factor turned off, each with a code.
 * New recovery codes are flashed once, to the next render of the page.
 *
 * @internal
 */
trait ManagesTwoFactor
{
    private const string FLASHED_CODES = 'tbtop_two_factor.recovery_codes';

    /** @return list<FormBuilder> Empty while the panel serves no challenge page. */
    protected function twoFactorForms(S $s): array
    {
        if (TwoFactorChallengePage::currentUrl() === null) {
            return [];
        }
        $user = $this->user();
        if (TwoFactorCodes::isEnabled($user)) {
            return [$this->twoFactorManageForm($s, $user)];
        }
        $secret = TwoFactorEnrollment::pendingSecret($user);

        return [$secret === null ? $this->twoFactorEnableForm($s) : $this->twoFactorConfirmForm($s, $user, $secret)];
    }

    private function twoFactorEnableForm(S $s): FormBuilder
    {
        return $s->form('two_factor_enable', $this->twoFactorCard(__('tbtop-admin::admin.auth.two_factor.off'), [
            $s->password('current_password')->label(__('tbtop-admin::admin.auth.profile.current'))->required(),
            $s->actionsRow([
                $s->action('enable')->label(__('tbtop-admin::admin.auth.two_factor.enable'))->color('primary')->submit(),
            ]),
        ], $s))
            ->guardUnsaved(false)
            ->record(['current_password' => ''])
            ->onSubmit(function (ActionCtx $ctx): Effects {
                $this->confirmCurrentPassword($this->user(), $ctx->form['current_password'] ?? null);
                TwoFactorEnrollment::start($this->user());

                return Effects::make();
            });
    }

    private function twoFactorConfirmForm(S $s, Model $user, string $secret): FormBuilder
    {
        return $s->form('two_factor_confirm', $this->twoFactorCard(__('tbtop-admin::admin.auth.two_factor.scan'), [
            $s->displayImage(TwoFactorEnrollment::qrCode($user, $secret))->alt(__('tbtop-admin::admin.auth.two_factor.qr_alt')),
            $s->displayValue(trim(chunk_split($secret, 4, ' ')))->copyable(__('tbtop-admin::admin.auth.two_factor.copied')),
            $s->otp('code')->label(__('tbtop-admin::admin.auth.two_factor.code'))->length(6)->required(),
            $s->actionsRow([
                $s->action('confirm')->label(__('tbtop-admin::admin.auth.two_factor.confirm'))->color('primary')->submit(),
                $s->action('cancel')->label(__('tbtop-admin::admin.auth.two_factor.cancel'))->withoutValidation()
                    ->handle(fn (): Effects => $this->cancelTwoFactor()),
            ]),
        ], $s))
            ->guardUnsaved(false)
            ->record(['code' => ''])
            ->onSubmit(fn (ActionCtx $ctx): Effects => $this->confirmTwoFactor($ctx));
    }

    private function twoFactorManageForm(S $s, Model $user): FormBuilder
    {
        $flashed = session(self::FLASHED_CODES);
        $count = count(TwoFactorCodes::recoveryCodes($user));
        $codes = is_array($flashed) ? [
            $s->displayAlert(__('tbtop-admin::admin.auth.two_factor.save_codes'))->color('warning'),
            $s->displayValue(implode("\n", $flashed))->multiline()->copyable(__('tbtop-admin::admin.auth.two_factor.copied')),
        ] : [];

        return $s->form('two_factor_manage', $this->twoFactorCard(trans_choice('tbtop-admin::admin.auth.two_factor.on', $count, ['count' => $count]), [
            ...$codes,
            $s->text('code')->label(__('tbtop-admin::admin.auth.two_factor.manage_code'))->required()->rules(['string', 'max:64']),
            $s->actionsRow([
                $s->action('regenerate')->label(__('tbtop-admin::admin.auth.two_factor.regenerate'))->submit(),
                $s->action('disable')->label(__('tbtop-admin::admin.auth.two_factor.disable'))->color('danger')
                    ->confirm(__('tbtop-admin::admin.auth.two_factor.disable_confirm'))
                    ->handle(fn (ActionCtx $ctx): Effects => $this->disableTwoFactor($ctx)),
            ]),
        ], $s))
            ->guardUnsaved(false)
            ->record(['code' => ''])
            ->onSubmit(fn (ActionCtx $ctx): Effects => $this->regenerateRecoveryCodes($ctx));
    }

    /** @param  list<mixed>  $children @return list<mixed> */
    private function twoFactorCard(string $description, array $children, S $s): array
    {
        return [$s->section(['title' => __('tbtop-admin::admin.auth.two_factor.title'), 'description' => $description, 'variant' => 'card'], $children)];
    }

    /** The enrolling session has just shown the factor, so it counts as passed: the panel does not challenge it straight away. */
    private function confirmTwoFactor(ActionCtx $ctx): Effects
    {
        $user = $this->user();
        $codes = TwoFactorEnrollment::confirm($user, (string) $ctx->form['code']);
        if ($codes === null) {
            throw ValidationException::withMessages(['code' => __('tbtop-admin::admin.auth.two_factor.invalid')]);
        }
        (new TwoFactorSession($ctx->request->session(), static::panel()->guard()))->pass($user);
        $ctx->request->session()->flash(self::FLASHED_CODES, $codes);

        return Effects::make()->notify(__('tbtop-admin::admin.auth.two_factor.enabled'));
    }

    private function cancelTwoFactor(): Effects
    {
        $user = $this->user();
        if (! TwoFactorCodes::isEnabled($user)) {
            TwoFactorEnrollment::disable($user);
        }

        return Effects::make()->redirect(static::currentUrl() ?? static::panel()->pathPrefix());
    }

    private function regenerateRecoveryCodes(ActionCtx $ctx): Effects
    {
        $user = $this->verifiedTwoFactorUser($ctx);
        $ctx->request->session()->flash(self::FLASHED_CODES, TwoFactorEnrollment::regenerateRecoveryCodes($user));

        return Effects::make()->notify(__('tbtop-admin::admin.auth.two_factor.regenerated'))->resetForm('two_factor_manage');
    }

    private function disableTwoFactor(ActionCtx $ctx): Effects
    {
        TwoFactorEnrollment::disable($this->verifiedTwoFactorUser($ctx));

        return Effects::make()->notify(__('tbtop-admin::admin.auth.two_factor.disabled'))
            ->redirect(static::currentUrl() ?? static::panel()->pathPrefix());
    }

    /** The signed-in user, once the submitted code proves they still hold the factor. */
    private function verifiedTwoFactorUser(ActionCtx $ctx): Model
    {
        $user = $this->user();
        if (TwoFactorCodes::isLockedOut($user)) {
            throw ValidationException::withMessages(['code' => TwoFactorCodes::lockoutMessage($user)]);
        }
        if (! TwoFactorCodes::verify($user, (string) ($ctx->form['code'] ?? ''))) {
            throw ValidationException::withMessages(['code' => __('tbtop-admin::admin.auth.two_factor.invalid')]);
        }

        return $user;
    }
}
