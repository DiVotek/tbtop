<?php

namespace Tbtop\Admin\Dsl\Fields;

final class Upload extends Field
{
    protected function kind(): string
    {
        return 'upload';
    }

    /** Accepted MIME types / extensions, e.g. 'image/*' or '.pdf'. */
    public function accept(string $accept): static
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

    /** Writes one key under the nested `image` options bag. */
    private function setImage(string $key, mixed $value): static
    {
        $image = $this->opts['image'] ?? [];
        $image[$key] = $value;

        return $this->set('image', $image);
    }
}
