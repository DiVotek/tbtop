<?php

namespace Tbtop\Admin\Testing;

/**
 * Path segments of a page's endpoint cluster, as routes/admin.php registers
 * them under the page's own path.
 *
 * @internal
 */
final class Endpoints
{
    public const SEGMENTS = [
        'form' => 'forms',
        'action' => 'actions',
        'table' => 'tables',
        'data' => 'data',
        'selectCreate' => 'select-create',
        'selectOptions' => 'select-options',
        'daterangeRanges' => 'daterange-ranges',
        'liveRegion' => 'live-region',
        'relationSearch' => 'relation-search',
        'relationCreate' => 'relation-create',
        'upload' => 'uploads',
        'cell' => 'cells',
    ];
}
