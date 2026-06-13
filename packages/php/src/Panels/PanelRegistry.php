<?php

namespace Tbtop\Admin\Panels;

use InvalidArgumentException;

/**
 * Resolved panel configurations, keyed by panel id.
 * Built once from `config('tbtop-admin.panels')` (list of Panel class-strings).
 */
final class PanelRegistry
{
    /** @param  array<string, PanelConfig>  $panels */
    private function __construct(private readonly array $panels) {}

    public static function fromConfig(): self
    {
        /** @var list<class-string<Panel>> $classes */
        $classes = (array) config('tbtop-admin.panels', []);

        $panels = [];
        foreach ($classes as $class) {
            $config = (new $class)->configure(new PanelConfig);
            $id = $config->getId();
            if ($id === '') {
                throw new InvalidArgumentException("Panel [{$class}] must set an id in configure().");
            }
            if (isset($panels[$id])) {
                throw new InvalidArgumentException("Duplicate panel id [{$id}] declared by [{$class}].");
            }
            $panels[$id] = $config;
        }

        return new self($panels);
    }

    /** @return array<string, PanelConfig> */
    public function all(): array
    {
        return $this->panels;
    }

    public function get(string $id): PanelConfig
    {
        return $this->panels[$id]
            ?? throw new InvalidArgumentException("Unknown panel [{$id}]. Registered: ".implode(', ', array_keys($this->panels)).'.');
    }
}
