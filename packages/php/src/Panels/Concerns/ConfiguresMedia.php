<?php

namespace Tbtop\Admin\Panels\Concerns;

use InvalidArgumentException;

/**
 * Access to the panel's media-manager API (`{prefix}/api/media/*`). Server-only:
 * none of this reaches the Inertia share or the wire.
 */
trait ConfiguresMedia
{
    private ?string $mediaGate = null;

    /**
     * Gate ability every media-manager endpoint (list, show, download, upload, URL import,
     * edit, replace, delete, folders) requires; a user who fails it gets 403. Null, the
     * default, leaves the API open to every user who passes the panel's middleware.
     */
    public function mediaGate(?string $ability): static
    {
        // The ability becomes `can:{ability}` route middleware, whose parameters split on commas.
        if ($ability !== null && ($ability === '' || preg_match('/[\s,]/', $ability) === 1)) {
            throw new InvalidArgumentException("mediaGate() needs a plain Gate ability name, got '{$ability}'.");
        }
        $this->mediaGate = $ability;

        return $this;
    }

    /** Ability the media-manager API requires, or null when it is open to every panel user. */
    public function getMediaGate(): ?string
    {
        return $this->mediaGate;
    }
}
