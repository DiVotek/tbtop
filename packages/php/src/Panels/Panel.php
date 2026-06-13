<?php

namespace Tbtop\Admin\Panels;

/**
 * A panel is one admin instance: its own prefix, guard, pages and UI locales.
 * Consumers extend this class and register it under `tbtop-admin.panels`.
 */
abstract class Panel
{
    abstract public function configure(PanelConfig $panel): PanelConfig;
}
