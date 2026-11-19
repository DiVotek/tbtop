<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Dsl\Concerns\HasMultiple;
use Tbtop\Admin\Uploads\CropAspects;
use Tbtop\Admin\Uploads\UploadFieldConfig;

final class Upload extends Field
{
    use HasMultiple;

    /** Opt keys nested under `image` whose value may be a zero-arity Closure. */
    private const IMAGE_RESOLVABLE = ['convertTo', 'quality'];

    /** Server-side override for how an uploaded file is stored/persisted. */
    private ?Closure $saveClosure = null;

    protected function kind(): string
    {
        return 'upload';
    }

    /**
     * Override how an uploaded file is stored. The closure receives the
     * UploadedFile and the resolved UploadFieldConfig and must return the wire
     * shape `{path, url}`. Default stores to the configured disk. Never
     * serialized to the client.
     *
     * Bypasses UploadStorer::store() entirely, so SVG sanitization is skipped —
     * the mime-guard (accept + text/html rejection) still runs first, but a
     * custom closure that stores SVGs must sanitize them itself.
     *
     * @param  Closure(UploadedFile, UploadFieldConfig): array{path: string, url: string}  $fn
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
     * A list is joined with commas: the wire grammar types `accept` as a
     * string, and the client passes it straight to the DOM attribute.
     *
     * @param  string|list<string>  $accept
     */
    public function accept(string|array $accept): static
    {
        return $this->set('accept', is_array($accept) ? implode(',', $accept) : $accept);
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

    /**
     * Convert the stored image to this format ('webp'|'jpeg'|'png').
     *
     * @param  string|(Closure(): string)  $format
     */
    public function convertTo(string|Closure $format): static
    {
        return $this->setImage('convertTo', self::typedDeferral($format, 'string', 'Upload::convertTo'));
    }

    /**
     * Encoder quality (1-100) for the converted image.
     *
     * @param  int|(Closure(): int)  $q
     */
    public function quality(int|Closure $q): static
    {
        return $this->setImage('quality', self::typedDeferral($q, 'int', 'Upload::quality'));
    }

    /**
     * Maximum number of files when multiple is enabled. Not Closure-resolvable:
     * RuleWalker turns it into the server-side `max:` rule, so it stays a literal.
     */
    public function maxFiles(int $max): static
    {
        return $this->set('maxFiles', $max);
    }

    /** Allow drag-to-reorder when multiple is enabled. */
    public function reorderable(bool $value = true): static
    {
        return $this->set('reorderable', $value);
    }

    /**
     * Open a crop dialog before an image uploads, locked to one aspect ratio
     * ('16:9', '1:1') or free when omitted. The browser crops and uploads the
     * result; the original is not kept. Client-side only: enforce a ratio
     * server-side with Laravel's `dimensions:ratio=` rule.
     */
    public function crop(?string $aspect = null): static
    {
        return $this->cropAspects([$aspect ?? 'free']);
    }

    /**
     * Crop with a choice of aspect ratios in the dialog, the first preselected.
     * Each entry is 'W:H' or 'free'.
     *
     * @param  non-empty-list<string>  $aspects
     */
    public function cropAspects(array $aspects): static
    {
        $crop = $this->opts['image']['crop'] ?? [];
        $crop['aspects'] = CropAspects::normalize($aspects);

        return $this->setImage('crop', $crop);
    }

    /** Round crop mask (avatars); the stored file stays rectangular. Defaults the aspect to '1:1'. */
    public function cropCircle(bool $value = true): static
    {
        $crop = $this->opts['image']['crop'] ?? null;
        if ($crop === null && ! $value) {
            return $this;
        }
        $crop ??= ['aspects' => ['1:1']];
        $crop['shape'] = $value ? 'round' : 'rect';

        return $this->setImage('crop', $crop);
    }

    /** Writes one key under the nested `image` options bag. */
    private function setImage(string $key, mixed $value): static
    {
        $image = $this->opts['image'] ?? [];
        $image[$key] = $value;

        return $this->set('image', $image);
    }

    /** @return array<string, mixed> */
    protected function resolvedOpts(): array
    {
        $opts = parent::resolvedOpts();
        if (isset($opts['image']) && is_array($opts['image'])) {
            foreach (self::IMAGE_RESOLVABLE as $key) {
                if (array_key_exists($key, $opts['image'])) {
                    $opts['image'][$key] = $this->resolveOpt($opts['image'][$key]);
                }
            }
        }

        return $opts;
    }
}
