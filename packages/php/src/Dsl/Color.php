<?php

namespace Tbtop\Admin\Dsl;

/**
 * Semantic color tokens for badges, booleans, and icon maps.
 * On the wire, serialized as lowercase string value.
 * Accepts Color|string everywhere — a plain string means a custom client-registered color.
 */
enum Color: string
{
    case Gray = 'gray';
    case Info = 'info';
    case Success = 'success';
    case Warning = 'warning';
    case Danger = 'danger';
    case Primary = 'primary';
}
