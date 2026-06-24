<?php

namespace App\Admin\Pages;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Pages\Page;

/**
 * Two-factor enrollment page. A thin DSL host: it emits the custom
 * `twoFactorSetup` client block, which owns the whole stateful flow
 * (fetch QR + secret → confirm OTP → show recovery codes) by talking
 * directly to the plain-JSON endpoints in routes/auth.php:
 *
 *   POST /two-factor/setup   → { qr_svg, secret }
 *   POST /two-factor/confirm → { recovery_codes: [...] }
 *
 * Those endpoints are NOT Inertia, so the flow can't ride a DSL form's
 * Inertia onSubmit — the custom block is the boundary-correct escape hatch.
 * The block is registered in apps/demo/resources/js/admin.tsx.
 */
class TwoFactorSetupPage extends Page
{
    public static function path(): string
    {
        return 'two-factor/setup';
    }

    public function layout(): string
    {
        return 'center';
    }

    public static function nav(): ?array
    {
        return ['group' => 'System', 'label' => 'Two-factor setup', 'order' => 50, 'icon' => 'lock'];
    }

    public function title(): string
    {
        return 'Two-factor authentication';
    }

    public function view(S $s): Node
    {
        // Custom client block. Endpoints are passed as options so the block
        // never hard-codes routes; the client owns rendering + fetches.
        return new Node('twoFactorSetup', [
            'setupUrl' => '/two-factor/setup',
            'confirmUrl' => '/two-factor/confirm',
        ]);
    }
}
