<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Dsl\Concerns\HasMultiple;
use Tbtop\Admin\Uploads\UploadFieldConfig;

final class Upload extends Field
{
    use HasMultiple;

    /** Server-side override for how an uploaded file is stored/persisted. */
    private ?Closure $saveClosure = null;

    protected function kind(): string
    {
        return 'upload';
    }

    /**
     * Override how an uploaded file is stored. The closure receives the
     * UploadedFile and the resolved UploadFieldConfig and must return the wire
     * envelope (id, filename, mimeType, filesize, url, width, height, sizes).
     * Default stores to the configured disk. Never serialized to the client.
     *
     * @param  Closure(UploadedFile, UploadFieldConfig): array<string, mixed>  $fn
     */
    public function saveUsing(Closure $fn): static
    {
        $this->saveClosure = $fn;

        return $this;
    }

    public function saveClosure(): ?Closure
    {
        return $this->saveClosure;
    }

    /**
     * Accepted MIME types / extensions, e.g. 'image/*', '.pdf', or a list
     * ['application/pdf', 'image/*'] to allow several.
     *
     * @param  string|list<string>  $accept
     */
    public function accept(string|array $accept): static
    {
        return $this->set('accept', $accept);
    }

    /** Laravel filesystem disk name (default 'public'). */
    public function disk(string $disk): static
    {
        return $this->set('disk', $disk);
    }

    /** Subdirectory the file is stored under (default 'uploads'). */
    public function directory(string $dir): static
    {
        return $this->set('directory', $dir);
    }

    /** Storage visibility: 'public' (default) or 'private'. */
    public function visibility(string $v): static
    {
        return $this->set('visibility', $v);
    }

    /** Max upload size in bytes (default 5 MiB). */
    public function maxSize(int $bytes): static
    {
        return $this->set('maxSize', $bytes);
    }

    /** Base config preset name from config('tbtop-admin.uploads'). */
    public function profile(string $name): static
    {
        return $this->set('profile', $name);
    }

    /** Convert the stored image to this format ('webp'|'jpeg'|'png'). */
    public function convertTo(string $format): static
    {
        return $this->setImage('convertTo', $format);
    }

    /** Encoder quality (1-100) for the converted image. */
    public function quality(int $q): static
    {
        return $this->setImage('quality', $q);
    }

    /** Maximum number of files when multiple is enabled. */
    public function maxFiles(int $max): static
    {
        return $this->set('maxFiles', $max);
    }

    /** Allow drag-to-reorder when multiple is enabled. */
    public function reorderable(bool $value = true): static
    {
        return $this->set('reorderable', $value);
    }

    /** Writes one key under the nested `image` options bag. */
    private function setImage(string $key, mixed $value): static
    {
        $image = $this->opts['image'] ?? [];
        $image[$key] = $value;

        return $this->set('image', $image);
    }
}
