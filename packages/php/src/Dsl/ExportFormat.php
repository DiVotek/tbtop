<?php

namespace Tbtop\Admin\Dsl;

/**
 * File formats an ExportAction can produce. Serialized as the lowercase
 * value; the set is closed, so only the enum is accepted.
 */
enum ExportFormat: string
{
    case Csv = 'csv';
    case Xlsx = 'xlsx';
}
