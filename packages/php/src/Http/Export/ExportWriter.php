<?php

namespace Tbtop\Admin\Http\Export;

/**
 * One file format of a table export. Rows arrive one at a time and are
 * written to $out as they come, so an export never holds the whole file.
 */
interface ExportWriter
{
    public function contentType(): string;

    public function extension(): string;

    /**
     * @param  resource  $out
     * @param  list<string>  $headers
     */
    public function open($out, array $headers): void;

    /** @param  list<string|int|float>  $cells */
    public function row(array $cells): void;

    public function close(): void;
}
