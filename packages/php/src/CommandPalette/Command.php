<?php

namespace Tbtop\Admin\CommandPalette;

use Tbtop\Admin\Dsl\Concerns\HasIcon;

/**
 * A custom command-palette entry: a label plus an internal/external URL or a
 * registered client handler. Page-independent, so it carries no server closure.
 */
final class Command
{
    use HasIcon;

    private string $href = '';

    private ?string $handler = null;

    private ?string $group = null;

    private bool $newTab = false;

    /** @var list<string> */
    private array $keywords = [];

    private function __construct(private readonly string $label) {}

    public static function make(string $label): self
    {
        return new self($label);
    }

    /** Navigate to a URL — an internal path (Inertia visit) or an external link. */
    public function url(string $url): self
    {
        $this->href = $url;

        return $this;
    }

    /** Run a client handler registered via definePaletteCommand() instead of navigating. */
    public function handler(string $name): self
    {
        $this->handler = $name;

        return $this;
    }

    /** Group heading the command is listed under. */
    public function group(string $group): self
    {
        $this->group = $group;

        return $this;
    }

    public function openInNewTab(bool $newTab = true): self
    {
        $this->newTab = $newTab;

        return $this;
    }

    /** Extra search terms beyond the label. @param  list<string>  $keywords */
    public function keywords(array $keywords): self
    {
        $this->keywords = $keywords;

        return $this;
    }

    /**
     * Sparse wire payload: label always; everything else only when set.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $out = ['label' => $this->label];
        if ($this->href !== '') {
            $out['href'] = $this->href;
        }
        if ($this->handler !== null) {
            $out['handler'] = $this->handler;
        }
        $out += $this->iconOption();
        if ($this->group !== null) {
            $out['group'] = $this->group;
        }
        if ($this->newTab) {
            $out['newTab'] = true;
        }
        if ($this->keywords !== []) {
            $out['keywords'] = $this->keywords;
        }

        return $out;
    }
}
