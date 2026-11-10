<?php

namespace Tbtop\Admin\Http\Export;

/**
 * A single-sheet XLSX written row by row into a streamed zip. Text goes in
 * as inline strings, numbers as numbers; the header row is bold and frozen.
 */
final class XlsxWriter implements ExportWriter
{
    /** Excel's per-cell character limit. */
    private const MAX_CELL = 32767;

    private ?ZipStream $zip = null;

    public function contentType(): string
    {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    public function extension(): string
    {
        return 'xlsx';
    }

    public function open($out, array $headers): void
    {
        $this->zip = new ZipStream($out);
        foreach (XlsxParts::static() as $name => $xml) {
            $this->zip->addFile($name, $xml);
        }
        $this->zip->begin('xl/worksheets/sheet1.xml');
        $this->zip->write(XlsxParts::SHEET_OPEN);
        $this->zip->write($this->rowXml($headers, ' s="1"'));
    }

    public function row(array $cells): void
    {
        $this->zip?->write($this->rowXml($cells, ''));
    }

    public function close(): void
    {
        if ($this->zip === null) {
            return;
        }
        $this->zip->write(XlsxParts::SHEET_CLOSE);
        $this->zip->end();
        $this->zip->finish();
        $this->zip = null;
    }

    /** @param  list<string|int|float>  $cells */
    private function rowXml(array $cells, string $style): string
    {
        $xml = '<row>';
        foreach ($cells as $cell) {
            $xml .= (is_int($cell) || (is_float($cell) && is_finite($cell)))
                ? "<c{$style}><v>{$cell}</v></c>"
                : "<c{$style} t=\"inlineStr\"><is><t xml:space=\"preserve\">".self::text((string) $cell).'</t></is></c>';
        }

        return $xml.'</row>';
    }

    /** XML-escaped, invalid XML 1.0 characters dropped, capped at Excel's limit. */
    private static function text(string $value): string
    {
        $value = mb_scrub($value, 'UTF-8');
        $value = (string) preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value);
        $value = mb_substr($value, 0, self::MAX_CELL, 'UTF-8');

        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
