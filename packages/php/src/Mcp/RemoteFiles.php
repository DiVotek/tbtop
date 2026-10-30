<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\MediaPicker;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\RuleWalker;
use Tbtop\Admin\Media\MediaIngest;
use Tbtop\Admin\Media\MediaIngestException;
use Tbtop\Admin\Media\MimePolicy;
use Tbtop\Admin\Media\SvgSanitizeException;
use Tbtop\Admin\Media\UrlFetcher;
use Tbtop\Admin\Media\UrlFetchException;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;
use Tbtop\Admin\Uploads\UploadFieldConfig;
use Tbtop\Admin\Uploads\UploadStorer;
use Tbtop\Admin\Validation\IssuedUploadPath;

/**
 * Turns `{url}` values of upload and media fields into the files they point at, before
 * validation: an agent has no browser to upload through. Fetching goes through
 * UrlFetcher (SSRF guard, size cap, mime from content), storing through the same path as
 * the field's own upload endpoint or the media library's import.
 */
final class RemoteFiles
{
    /** Keys a remote reference may carry; any other key makes the value an ordinary one. */
    private const KEYS = ['url', 'alt', 'name'];

    /** Downloads one execute() may trigger, counted before the first one starts. */
    private const MAX_PER_CALL = 20;

    /** Whether $value is a `{url: "https://…"}` reference (media: plus `alt`, `name`). */
    public static function isRemote(mixed $value): bool
    {
        return is_array($value) && is_string($value['url'] ?? null)
            && array_diff(array_keys($value), self::KEYS) === [];
    }

    /** Whether $field's value may be sent as a remote reference. */
    public static function accepts(Field $field): bool
    {
        return $field instanceof Upload || ($field instanceof MediaPicker && self::mayImportMedia());
    }

    /**
     * $input with every remote reference in an upload or media field replaced by the
     * stored file: a path for an upload (issued to this session, as the upload endpoint
     * would), an id for media.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function fetchInto(FormBuilder $form, array $input): array
    {
        $sent = [];
        foreach (RuleWalker::fieldsByKey($form->getFields()) as $key => $field) {
            if (($field instanceof Upload || $field instanceof MediaPicker) && self::accepts($field)) {
                foreach (FormInput::sent($key, $input) as $path => $value) {
                    if (self::isRemote($value) && ($field->toNode()->options['multiple'] ?? false) === true) {
                        throw new AgentError("{$path}: a multiple field takes a list; send [{url}].");
                    }
                    $sent[] = [$field, $path, $value];
                }
            }
        }
        $count = array_sum(array_map(static fn (array $entry): int => self::count($entry[2]), $sent));
        if ($count > self::MAX_PER_CALL) {
            throw new AgentError('At most '.self::MAX_PER_CALL." files may be sent as {url} in one call; this one has {$count}.");
        }
        foreach ($sent as [$field, $path, $value]) {
            data_set($input, $path, self::resolve($field, $path, $value));
        }

        return $input;
    }

    /** The remote references in $value: itself, or those in its list or locale map. */
    private static function count(mixed $value): int
    {
        if (self::isRemote($value)) {
            return 1;
        }

        return is_array($value) ? array_sum(array_map(self::count(...), $value)) : 0;
    }

    /** $value with its remote references stored: a single one, a list of them, or one per locale. */
    private static function resolve(Upload|MediaPicker $field, string $path, mixed $value): mixed
    {
        if (self::isRemote($value)) {
            /** @var array{url: string, alt?: string, name?: string} $value */
            return $field instanceof Upload ? self::upload($field, $path, $value['url']) : self::media($field, $path, $value);
        }

        return is_array($value)
            ? array_map(static fn (mixed $entry): mixed => self::resolve($field, $path, $entry), $value)
            : $value;
    }

    private static function upload(Upload $field, string $path, string $url): string
    {
        $config = UploadFieldConfig::resolve($field);
        $file = self::fetch($path, $url, $config->accept);
        try {
            if ((int) $file->getSize() > $config->maxSize) {
                throw new AgentError("{$path}: ".__('tbtop-admin::admin.media.errors.file_too_large'));
            }
            $saver = $field->saveClosure()
                ?? static fn (UploadedFile $f, UploadFieldConfig $c): array => UploadStorer::store($f, $c);
            $stored = $saver($file, $config)['path'];
        } catch (SvgSanitizeException $e) {
            throw new AgentError("{$path}: ".__('tbtop-admin::admin.media.errors.'.$e->reason));
        } finally {
            @unlink($file->getPathname());
        }
        IssuedUploadPath::remember(self::sessionRequest(), $field->name, $stored);

        return $stored;
    }

    /** @param  array{url: string, alt?: string, name?: string}  $value */
    private static function media(MediaPicker $field, string $path, array $value): int|string
    {
        try {
            $media = app(MediaIngest::class)->import($value['url'], null, $value['name'] ?? null, $value['alt'] ?? null);
        } catch (MediaIngestException $e) {
            throw new AgentError("{$path}: ".__('tbtop-admin::admin.media.errors.'.$e->reason));
        }
        $accept = $field->toNode()->options['accept'] ?? [];
        if (is_array($accept) && ! MimePolicy::allows((string) $media->mime, array_values(array_map('strval', $accept)))) {
            $media->delete();
            throw new AgentError("{$path}: ".__('tbtop-admin::admin.media.errors.mime_not_allowed'));
        }

        return $media->getKey();
    }

    /** @param  list<string>  $accept */
    private static function fetch(string $path, string $url, array $accept): UploadedFile
    {
        try {
            return UrlFetcher::fetch($url, $accept);
        } catch (UrlFetchException $e) {
            throw new AgentError("{$path}: ".__('tbtop-admin::admin.media.errors.'.$e->reason));
        }
    }

    /** The media import endpoint runs behind the panel's mediaGate(); so does an import from a form. No panel bound: refused. */
    private static function mayImportMedia(): bool
    {
        $panel = CurrentPanel::current();
        if ($panel === null) {
            return false;
        }
        $gate = app(PanelRegistry::class)->get($panel->id())->getMediaGate();

        return $gate === null || Gate::allows($gate);
    }

    /** A request on the store the route-bound requests share (CallSession), for IssuedUploadPath. */
    private static function sessionRequest(): Request
    {
        $request = Request::create('/');
        $request->setLaravelSession(CallSession::store());

        return $request;
    }
}
