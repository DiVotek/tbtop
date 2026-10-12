<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Auth\Notifications\ResetPassword;

/**
 * Laravel's stock reset mail with the link pointing at the panel's reset page.
 * The URL is fixed at send time, not via the global createUrlUsing(), which
 * would hijack the host's own (e.g. public-site) reset links.
 */
class ResetPasswordNotification extends ResetPassword
{
    public function __construct(#[\SensitiveParameter] string $token, public readonly string $url)
    {
        parent::__construct($token);
    }

    protected function resetUrl($notifiable): string
    {
        return $this->url;
    }
}
