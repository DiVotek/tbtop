<?php

namespace Tbtop\Admin\Http\Export;

use DeflateContext;
use HashContext;

/**
 * A forward-only deflated zip written straight to a stream: each entry's
 * CRC and sizes follow its data in a data descriptor, so nothing is held
 * back or seeked. Enough for an XLSX package; no zip64 (entries < 4 GB).
 */
final class ZipStream
{
    private int $offset = 0;

    /** @var list<array{name: string, offset: int, crc: int, csize: int, usize: int}> */
    private array $entries = [];

    private ?string $name = null;

    private int $start = 0;

    private ?DeflateContext $deflate = null;

    private ?HashContext $crc = null;

    private int $csize = 0;

    private int $usize = 0;

    /** @param  resource  $out */
    public function __construct(private $out) {}

    public function addFile(string $name, string $data): void
    {
        $this->begin($name);
        $this->write($data);
        $this->end();
    }

    public function begin(string $name): void
    {
        $this->name = $name;
        $this->start = $this->offset;
        $this->deflate = deflate_init(ZLIB_ENCODING_RAW) ?: null;
        $this->crc = hash_init('crc32b');
        $this->csize = $this->usize = 0;
        $this->emit(pack('VvvvvvVVVvv', 0x04034B50, 20, 0x0808, 8, 0, 0x21, 0, 0, 0, strlen($name), 0).$name);
    }

    public function write(string $data): void
    {
        if ($data === '' || $this->deflate === null || $this->crc === null) {
            return;
        }
        hash_update($this->crc, $data);
        $this->usize += strlen($data);
        $this->emitData((string) deflate_add($this->deflate, $data, ZLIB_NO_FLUSH));
    }

    public function end(): void
    {
        if ($this->deflate === null || $this->crc === null || $this->name === null) {
            return;
        }
        $this->emitData((string) deflate_add($this->deflate, '', ZLIB_FINISH));
        $crc = (int) unpack('N', hash_final($this->crc, true))[1];
        $this->emit(pack('VVVV', 0x08074B50, $crc, $this->csize, $this->usize));
        $this->entries[] = ['name' => $this->name, 'offset' => $this->start, 'crc' => $crc, 'csize' => $this->csize, 'usize' => $this->usize];
        $this->deflate = $this->crc = $this->name = null;
    }

    public function finish(): void
    {
        $start = $this->offset;
        foreach ($this->entries as $e) {
            $this->emit(pack('VvvvvvvVVVvvvvvVV', 0x02014B50, 20, 20, 0x0808, 8, 0, 0x21, $e['crc'], $e['csize'], $e['usize'], strlen($e['name']), 0, 0, 0, 0, 0, $e['offset']).$e['name']);
        }
        $count = count($this->entries);
        $this->emit(pack('VvvvvVVv', 0x06054B50, 0, 0, $count, $count, $this->offset - $start, $start, 0));
    }

    private function emitData(string $bytes): void
    {
        $this->csize += strlen($bytes);
        $this->emit($bytes);
    }

    private function emit(string $bytes): void
    {
        fwrite($this->out, $bytes);
        $this->offset += strlen($bytes);
    }
}
