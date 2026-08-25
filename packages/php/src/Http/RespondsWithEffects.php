<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Tbtop\Admin\Actions\Effects;

/**
 * Shared "handler returned nothing meaningful" policy for the JSON action
 * endpoints (ActionController, EditableColumnController, TableReorderController).
 * Each endpoint states its own default explicitly rather than reinventing the
 * instanceof check — see the review that motivated this (arch/effects-envelope).
 *
 * FormSubmitController does NOT use this: persistence goes through Inertia's
 * native flash + back() per the transport rule, not a JSON envelope.
 */
trait RespondsWithEffects
{
    private function respondWithEffects(mixed $handlerResult, Effects $default): JsonResponse
    {
        return response()->json([
            'effects' => $handlerResult instanceof Effects ? $handlerResult : $default,
        ]);
    }
}
