<?php

namespace Tbtop\Admin\Http\Export;

/**
 * RFC 4180 CSV: UTF-8 with a BOM (so Excel reads the encoding), comma
 * separated, CRLF line ends. A text cell a spreadsheet would run as a
 * formula (leading = + - @, tab or CR) gets a leading apostrophe.
 */
final class CsvWriter implements ExportWriter
{
    /** @var resource */
    private $out;

    public function contentType(): string
    {
        return 'text/csv; charset=UTF-8';
    }

    public function extension(): string
    {
        return 'csv';
    }

    public function open($out, array $headers): void
    {
        $this->out = $out;
        fwrite($out, "\u{FEFF}");
        $this->row($headers);
    }

    public function row(array $cells): void
    {
        fputcsv($this->out, array_map(self::guard(...), $cells), ',', '"', '', "\r\n");
    }

    public function close(): void {}

    private static function guard(string|int|float $cell): string|int|float
    {
        if (! is_string($cell) || $cell === '') {
            return $cell;
        }

        return in_array($cell[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$cell : $cell;
    }
}
