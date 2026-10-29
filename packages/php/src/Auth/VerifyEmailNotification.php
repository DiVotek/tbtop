<?php

namespace Tbtop\Admin\Auth;

use Illuminate\Auth\Notifications\VerifyEmail;

/**
 * Laravel's stock verification mail with the link pointing at the panel's
 * signed verify route. The URL is fixed at send time, not via the global
 * createUrlUsing(), which would hijack the host's own verification links.
 */
class VerifyEmailNotification extends VerifyEmail
{
    public function __construct(public readonly string $url) {}

    protected function verificationUrl($notifiable): string
    {
        return $this->url;
    }
}
