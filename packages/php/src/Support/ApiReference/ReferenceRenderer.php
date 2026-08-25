<?php

namespace Tbtop\Admin\Support\ApiReference;

/** @internal Renders one classified surface into a Markdown page. */
final class ReferenceRenderer
{
    public function __construct(
        private readonly MethodClassifier $classifier = new MethodClassifier,
        private readonly MethodReader $reader = new MethodReader,
    ) {}

    /**
     * @param  array{title: string, intro: string, classes: array<string, class-string>}  $surface
     */
    public function render(string $slug, array $surface): string
    {
        $lines = [
            '<!-- GENERATED — do not edit by hand.',
            '     Source: docblocks in packages/php/src. Regenerate with:',
            '     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->',
            '',
            '# '.$surface['title'],
            '',
            '> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in',
            '> the hand-written docs; this page is the exhaustive method list.',
            '',
            $surface['intro'],
            '',
        ];

        foreach ($surface['classes'] as $label => $class) {
            $lines = [...$lines, ...$this->renderClass($label, $class)];
        }

        return implode("\n", $lines);
    }

    /**
     * @param  class-string  $class
     * @return list<string>
     */
    private function renderClass(string $label, string $class): array
    {
        $methods = $this->classifier->classify($class)['authoring'];
        $lines = ['## '.$label, '', '`'.$class.'`', ''];

        // A field with no methods of its own still belongs here: omitting it
        // reads as "this kind does not exist".
        if ($methods === []) {
            return [...$lines, 'No methods beyond the shared base — see [Every field](#every-field).', ''];
        }

        $grouped = $this->groupByOrigin($methods, $class);

        foreach ($grouped as $origin => $originMethods) {
            if ($origin !== '') {
                $lines[] = '**From `'.$origin.'`:**';
                $lines[] = '';
            }

            $lines[] = '| Method | What it does |';
            $lines[] = '|---|---|';

            foreach ($originMethods as $method) {
                $info = $this->reader->read($method);
                $lines[] = '| `'.$info->signature.'` | '.$this->cell($info).' |';
            }

            $lines[] = '';
        }

        return $lines;
    }

    /**
     * Own methods first (empty key), then one block per trait, so a reader sees
     * what the class itself adds before the shared concerns.
     *
     * @param  list<\ReflectionMethod>  $methods
     * @return array<string, list<\ReflectionMethod>>
     */
    private function groupByOrigin(array $methods, string $class): array
    {
        $own = [];
        $traits = [];

        foreach ($methods as $method) {
            $declaring = $method->getDeclaringClass()->getName();

            if ($declaring === $class) {
                $own[] = $method;

                continue;
            }

            $short = substr((string) strrchr($declaring, '\\'), 1);
            $traits[$short][] = $method;
        }

        ksort($traits);

        return $own === [] ? $traits : ['' => $own, ...$traits];
    }

    private function cell(MethodInfo $info): string
    {
        if (! $info->isDocumented()) {
            return '—';
        }

        return str_replace(['|', "\n"], ['\\|', ' '], $info->description);
    }
}
