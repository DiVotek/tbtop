<?php

namespace Tbtop\Admin\CommandPalette;

/**
 * Fluent per-panel command-palette (⌘K) configuration. Enabled by default and
 * lists every sidebar destination; serializes sparsely (omits defaults).
 */
final class CommandPaletteConfig
{
    public const DEFAULT_HOTKEY = 'mod+k';

    private bool $enabled = true;

    private ?string $placeholder = null;

    private string $hotkey = self::DEFAULT_HOTKEY;

    private bool $includeNav = true;

    /** @var list<Command> */
    private array $commands = [];

    /** Palette is enabled by default; pass false to disable it (same as disable()). */
    public function enable(bool $enabled = true): static
    {
        $this->enabled = $enabled;

        return $this;
    }

    /** Sugar for enable(false); a disabled palette is omitted from the wire entirely. */
    public function disable(): static
    {
        $this->enabled = false;

        return $this;
    }

    /** Placeholder text for the palette search input. */
    public function placeholder(string $text): static
    {
        $this->placeholder = $text;

        return $this;
    }

    /** Keybinding that opens the palette (default ⌘K / Ctrl+K). */
    public function hotkey(string $spec): static
    {
        $this->hotkey = $spec;

        return $this;
    }

    /** Auto-list sidebar destinations (default true). false = commands only. */
    public function includeNav(bool $include = true): static
    {
        $this->includeNav = $include;

        return $this;
    }

    /** Replaces the custom command list; additive to includeNav()'s auto-listed sidebar destinations, not a substitute for it. @param  list<Command>  $commands */
    public function commands(array $commands): static
    {
        $this->commands = $commands;

        return $this;
    }

    /** Whether the ⌘K palette is registered for this panel at all. */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Sparse options for the client; empty when all defaults hold except the
     * hotkey, which is always emitted — the client has no default of its own
     * to fall back to. Disabled palettes are omitted from the wire by the
     * caller, not flagged here.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $out = ['hotkey' => $this->hotkey];
        if ($this->placeholder !== null) {
            $out['placeholder'] = $this->placeholder;
        }
        if (! $this->includeNav) {
            $out['includeNav'] = false;
        }
        if ($this->commands !== []) {
            $out['commands'] = array_map(static fn (Command $c): array => $c->toArray(), $this->commands);
        }

        return $out;
    }
}
