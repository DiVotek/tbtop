<?php

namespace Tbtop\Admin\Tests\Fixtures\Chromes;

use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Panels\Chrome;

/** Invalid by design: ->handle() actions cannot resolve in chrome. */
class ServerActionChrome extends Chrome
{
    protected function headerItems(S $s): array
    {
        return [
            ...parent::headerItems($s),
            $s->action('purge')->label('Purge')->handle(fn () => Effects::make()),
        ];
    }
}
