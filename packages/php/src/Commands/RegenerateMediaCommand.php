<?php

namespace Tbtop\Admin\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Tbtop\Admin\Media\MediaRegenerator;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Uploads\ConversionProfile;
use Throwable;

/**
 * Builds conversion variants for media uploaded before the current
 * `media.profiles`: by default only the variants a row lacks.
 */
class RegenerateMediaCommand extends Command
{
    protected $signature = 'tbtop:media-regenerate
        {--profile=* : Only these profiles (default: every configured profile)}
        {--force : Rebuild variants that already exist, e.g. after changing a profile\'s size or format}';

    protected $description = 'Generate missing media conversion variants from the stored originals.';

    public function handle(): int
    {
        $profiles = $this->profiles();
        if ($profiles === null) {
            return self::FAILURE;
        }

        $media = 0;
        $variants = 0;
        $failed = 0;
        foreach ($this->rasterMedia()->lazyById(100) as $row) {
            try {
                $written = MediaRegenerator::regenerate($row, $profiles, (bool) $this->option('force'));
            } catch (Throwable $e) {
                $failed++;
                $this->components->warn("Media #{$row->getKey()} ({$row->path}): {$e->getMessage()}");

                continue;
            }
            $media += $written > 0 ? 1 : 0;
            $variants += $written;
        }

        $this->components->info("Wrote {$variants} variant(s) for {$media} media item(s).");
        if ($failed > 0) {
            $this->components->error("{$failed} media item(s) failed; see the warnings above.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /** @return array<string, ConversionProfile>|null null after reporting an unknown --profile */
    private function profiles(): ?array
    {
        $all = ConversionProfile::fromConfig((array) config('tbtop-admin.media', []));
        /** @var list<string> $only */
        $only = (array) $this->option('profile');
        if ($only === []) {
            return $all;
        }
        $unknown = array_diff($only, array_keys($all));
        if ($unknown !== []) {
            $this->components->error('Unknown profile(s): '.implode(', ', $unknown).'. Configured: '.implode(', ', array_keys($all)).'.');

            return null;
        }

        return array_intersect_key($all, array_flip($only));
    }

    /** @return Builder<Media> */
    private function rasterMedia(): Builder
    {
        return Media::query()
            ->where('mime', 'like', 'image/%')
            ->where('mime', '!=', 'image/svg+xml');
    }
}
