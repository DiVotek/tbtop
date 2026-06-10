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
}
