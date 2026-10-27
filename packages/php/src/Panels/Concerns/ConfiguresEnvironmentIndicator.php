<?php

namespace Tbtop\Admin\Panels\Concerns;

use Closure;
use Illuminate\Support\Facades\App;
use InvalidArgumentException;

/**
 * Environment indicator for PanelConfig: a colored badge in the shell header
 * plus a strip along the top edge, so nobody mistakes staging for production.
 * Off until the author calls environmentIndicator(); resolved per request.
 */
trait ConfiguresEnvironmentIndicator
{
    /** Built-in color per common environment name; anything else is gray. */
    private const ENVIRONMENT_COLORS = [
        'local' => 'success',
        'development' => 'success',
        'dev' => 'success',
        'testing' => 'info',
        'test' => 'info',
        'staging' => 'warning',
        'stage' => 'warning',
        'production' => 'danger',
    ];

    /** Environments hidden unless the author lists them in the overrides array. */
    private const HIDDEN_ENVIRONMENTS = ['production'];

    /** @var Closure(): (array{label?: string, color?: string}|null)|array<string, string|false|array{label?: string, color?: string}>|false */
    private Closure|array|false $environmentIndicator = false;

    /**
     * Show the app environment as a colored header badge and top strip; hidden in production.
     * Pass an array to override per environment (`['staging' => 'warning', 'qa' => ['label' =>
     * 'QA', 'color' => 'info'], 'local' => false]` — listing `production` shows it), or a
     * Closure returning `['label' => …, 'color' => …]` or null, called per request.
     * Colors are the badge names: gray, primary, success, warning, danger, info.
     *
     * @param  Closure(): (array{label?: string, color?: string}|null)|array<string, string|false|array{label?: string, color?: string}>|bool  $indicator
     */
    public function environmentIndicator(Closure|array|bool $indicator = true): static
    {
        if (is_array($indicator)) {
            array_walk($indicator, self::assertEnvironmentOverride(...));
        }
        $this->environmentIndicator = $indicator === true ? [] : $indicator;

        return $this;
    }

    /**
     * Wire payload for the `tbtop.environment` shared prop, or null when hidden.
     *
     * @return array{label: string, color: string}|null
     */
    public function getEnvironmentIndicator(): ?array
    {
        if ($this->environmentIndicator === false) {
            return null;
        }
        if ($this->environmentIndicator instanceof Closure) {
            return self::environmentPayload(($this->environmentIndicator)(), self::currentEnvironment());
        }

        return self::environmentFromOverrides($this->environmentIndicator, self::currentEnvironment());
    }

    /**
     * @param  array<string, string|false|array{label?: string, color?: string}>  $overrides
     * @return array{label: string, color: string}|null
     */
    private static function environmentFromOverrides(array $overrides, string $env): ?array
    {
        if (! array_key_exists($env, $overrides)) {
            return in_array($env, self::HIDDEN_ENVIRONMENTS, true) ? null : self::environmentPayload([], $env);
        }
        $override = $overrides[$env];
        if ($override === false) {
            return null;
        }

        return self::environmentPayload(is_string($override) ? ['color' => $override] : $override, $env);
    }

    /**
     * @param  array{label?: string, color?: string}|null  $indicator
     * @return array{label: string, color: string}|null
     */
    private static function environmentPayload(?array $indicator, string $env): ?array
    {
        if ($indicator === null) {
            return null;
        }

        return [
            'label' => $indicator['label'] ?? ucfirst($env),
            'color' => $indicator['color'] ?? self::ENVIRONMENT_COLORS[$env] ?? 'gray',
        ];
    }

    private static function currentEnvironment(): string
    {
        return App::environment();
    }

    private static function assertEnvironmentOverride(mixed $override, int|string $env): void
    {
        if (! is_string($env) || ! (is_string($override) || $override === false || is_array($override))) {
            throw new InvalidArgumentException('environmentIndicator() overrides map an environment name to a color, a [label, color] array, or false.');
        }
    }
}
